// app/api/auth/register-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

// Mutation para registrar usuario
const REGISTER_CUSTOMER_ACCOUNT = /* GraphQL */ `
  mutation RegisterCustomerAccount($input: RegisterCustomerInput!) {
    registerCustomerAccount(input: $input) {
      __typename
      ... on Success {
        success
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

// Query para verificar si un correo ya existe intentando login
const CHECK_EMAIL_EXISTS = /* GraphQL */ `
  mutation CheckEmailExists($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      __typename
      ... on CurrentUser {
        id
      }
      ... on InvalidCredentialsError {
        errorCode
        message
      }
      ... on NotVerifiedError {
        errorCode
        message
      }
    }
  }
`;

export async function POST(req: NextRequest) {
  console.log('[register-user] POST request received');
  const raw = await req.json().catch(() => ({}));
  console.log('[register-user] Body:', raw);

  const { emailAddress, password, firstName, lastName, phoneNumber } = raw;

  // Validaciones mínimas
  if (!emailAddress || !password || !firstName || !lastName) {
    console.warn('[register-user] Missing fields:', raw);
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const input = {
    emailAddress: emailAddress.trim(),
    password: password.trim(),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phoneNumber: phoneNumber?.trim() || undefined,
  };
  console.log('[register-user] Registering user with:', input);

  // Verificar si el correo ya existe intentando hacer login
  // Primero intentamos con una contraseña dummy, luego con la contraseña real si es necesario
  console.log('[register-user] Checking if email already exists...');
  
  // Intentar login con contraseña dummy para verificar existencia
  const emailCheckDummy = await fetchGraphQL(
    {
      query: CHECK_EMAIL_EXISTS,
      variables: { 
        username: input.emailAddress, 
        password: 'dummy-password-to-check-email-existence-' + Date.now()
      },
    },
    { req }
  );

  const loginCheckDummyData = emailCheckDummy.data?.login;
  
  // Si obtenemos InvalidCredentialsError, significa que el correo existe pero la contraseña es incorrecta
  // Si obtenemos NotVerifiedError, significa que el correo existe pero no está verificado
  // Si obtenemos CurrentUser, significa que el correo existe y la contraseña dummy funcionó (muy improbable pero posible)
  if (loginCheckDummyData?.__typename === 'InvalidCredentialsError') {
    // El correo existe. Ahora verificamos si la contraseña que están intentando usar es la correcta
    const emailCheckReal = await fetchGraphQL(
      {
        query: CHECK_EMAIL_EXISTS,
        variables: { 
          username: input.emailAddress, 
          password: input.password
        },
      },
      { req }
    );

    const loginCheckRealData = emailCheckReal.data?.login;
    
    if (loginCheckRealData?.__typename === 'NotVerifiedError') {
      console.warn('[register-user] Email exists but not verified:', input.emailAddress);
      return NextResponse.json(
        {
          error: 'Este correo electrónico ya está registrado pero no ha sido verificado',
          errorCode: 'EMAIL_NOT_VERIFIED',
          message: 'Este correo electrónico ya está registrado. Por favor, verifica tu correo electrónico o intenta iniciar sesión.',
        },
        { status: 409 }
      );
    }
    
    if (loginCheckRealData?.__typename === 'CurrentUser') {
      console.warn('[register-user] Email exists and password is correct:', input.emailAddress);
      return NextResponse.json(
        {
          error: 'Este correo electrónico ya está registrado',
          errorCode: 'EMAIL_ADDRESS_CONFLICT_ERROR',
          message: 'Este correo electrónico ya está registrado. Por favor, inicia sesión en su lugar.',
        },
        { status: 409 }
      );
    }
    
    // Si la contraseña también es incorrecta, el correo existe pero con otra contraseña
    console.warn('[register-user] Email exists with different password:', input.emailAddress);
    return NextResponse.json(
      {
        error: 'Este correo electrónico ya está registrado',
        errorCode: 'EMAIL_ADDRESS_CONFLICT_ERROR',
        message: 'Este correo electrónico ya está registrado. Por favor, inicia sesión en su lugar.',
      },
      { status: 409 }
    );
  }
  
  if (loginCheckDummyData?.__typename === 'NotVerifiedError') {
    console.warn('[register-user] Email exists but not verified:', input.emailAddress);
    return NextResponse.json(
      {
        error: 'Este correo electrónico ya está registrado pero no ha sido verificado',
        errorCode: 'EMAIL_NOT_VERIFIED',
        message: 'Este correo electrónico ya está registrado. Por favor, verifica tu correo electrónico o intenta iniciar sesión.',
      },
      { status: 409 }
    );
  }
  
  if (loginCheckDummyData?.__typename === 'CurrentUser') {
    // Muy improbable pero posible: la contraseña dummy funcionó
    console.warn('[register-user] Email exists (dummy password worked):', input.emailAddress);
    return NextResponse.json(
      {
        error: 'Este correo electrónico ya está registrado',
        errorCode: 'EMAIL_ADDRESS_CONFLICT_ERROR',
        message: 'Este correo electrónico ya está registrado. Por favor, inicia sesión en su lugar.',
      },
      { status: 409 }
    );
  }

  // Llamar a Vendure
  const result = await fetchGraphQL(
    {
      query: REGISTER_CUSTOMER_ACCOUNT,
      variables: { input },
    },
    { req }
  );

  console.log('[register-user] Vendure response:', JSON.stringify(result, null, 2));

  // Manejo de errores de GraphQL
  if (result.errors?.length) {
    console.error('[register-user] GraphQL errors:', result.errors);
    
    // Verificar si algún error está relacionado con correo duplicado
    const hasEmailConflict = result.errors.some(err => 
      err.message?.includes('EMAIL_ADDRESS_CONFLICT') ||
      err.message?.toLowerCase().includes('email') && 
      (err.message?.toLowerCase().includes('already') || 
       err.message?.toLowerCase().includes('exists') ||
       err.message?.toLowerCase().includes('registered'))
    );
    
    if (hasEmailConflict) {
      return NextResponse.json(
        { 
          error: 'Este correo electrónico ya está registrado',
          errorCode: 'EMAIL_ADDRESS_CONFLICT_ERROR',
          message: 'Este correo electrónico ya está registrado'
        },
        { status: 409 }
      );
    }
    
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const resData = result.data?.registerCustomerAccount;
  
  // Verificar si hay un ErrorResult
  if (resData?.__typename === 'ErrorResult') {
    console.warn('[register-user] Vendure returned error result:', resData);
    
    // Verificar específicamente si es un error de correo duplicado
    if (resData.errorCode === 'EMAIL_ADDRESS_CONFLICT_ERROR') {
      console.warn('[register-user] Email address already registered');
      return NextResponse.json(
        { 
          error: 'Este correo electrónico ya está registrado',
          errorCode: 'EMAIL_ADDRESS_CONFLICT_ERROR',
          message: resData.message || 'Este correo electrónico ya está registrado'
        },
        { status: 409 } // 409 Conflict es más apropiado para recursos duplicados
      );
    }
    
    // Otros errores de ErrorResult
    return NextResponse.json(
      { 
        error: resData.message || 'Error al registrar usuario',
        errorCode: resData.errorCode,
        message: resData.message
      },
      { status: 400 }
    );
  }

  // Verificar que realmente fue exitoso
  if (resData?.__typename !== 'Success' || !resData.success) {
    console.warn('[register-user] Unexpected response format:', resData);
    return NextResponse.json(
      { error: 'Error inesperado al registrar usuario' },
      { status: 500 }
    );
  }

  const res = NextResponse.json({ success: true });
  // Propagar cookies si las hay
  for (const c of result.setCookies ?? []) res.headers.append('Set-Cookie', c);

  console.log('[register-user] Registration success');
  return res;
}

