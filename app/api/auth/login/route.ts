// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';

// Mutation para login
const LOGIN_MUTATION = /* GraphQL */ `
  mutation Login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      __typename
      ... on CurrentUser {
        id
        identifier
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

// Query para obtener información del cliente y orden activa después del login
const AUTH_STATE = /* GraphQL */ `
  query AuthState {
    me {
      id
      identifier
    }
    activeCustomer {
      id
      firstName
      lastName
      emailAddress
    }
    activeOrder {
      id
      code
      state
    }
  }
`;

export async function POST(req: NextRequest) {
  console.log('[login] POST request received');
  const raw = await req.json().catch(() => ({}));
  console.log('[login] Body:', raw);

  const { emailAddress, password } = raw;
  if (!emailAddress || !password) {
    return NextResponse.json(
      { 
        error: 'Missing credentials',
        message: 'Please provide both email and password'
      },
      { status: 400 }
    );
  }

  // Ejecutar login
  console.log('[login] Executing Vendure login...');
  const result = await fetchGraphQL(
    {
      query: LOGIN_MUTATION,
      variables: { username: emailAddress, password },
    },
    { req }
  );
  console.log('[login] Login response:', JSON.stringify(result, null, 2));

  const loginData = result.data?.login;

  if (!loginData || loginData.__typename !== 'CurrentUser') {
    console.warn('[login] Login failed:', loginData);
    
    // Manejar diferentes tipos de errores
    if (loginData?.__typename === 'InvalidCredentialsError') {
      return NextResponse.json(
        {
          error: 'Invalid credentials',
          message: loginData.message || 'Email or password is incorrect',
          errorCode: loginData.errorCode,
        },
        { status: 401 }
      );
    }
    
    if (loginData?.__typename === 'NotVerifiedError') {
      return NextResponse.json(
        {
          error: 'Email not verified',
          message: loginData.message || 'Please verify your email before logging in',
          errorCode: loginData.errorCode,
        },
        { status: 403 }
      );
    }
    
    // Error genérico
    return NextResponse.json(
      {
        error: 'Login failed',
        message: loginData?.message || 'Unable to log in. Please try again.',
        errorCode: loginData?.errorCode,
      },
      { status: 401 }
    );
  }

  // Obtener estado post-login
  const authState = await fetchGraphQL({ query: AUTH_STATE }, { req });
  console.log('[login] AuthState:', JSON.stringify(authState, null, 2));

  const res = NextResponse.json({
    success: true,
    user: loginData,
    auth: authState.data,
    message: 'Login successful',
  });

  // Propagar cookies (Vendure session)
  for (const c of result.setCookies ?? []) res.headers.append('Set-Cookie', c);
  for (const c of authState.setCookies ?? []) res.headers.append('Set-Cookie', c);

  console.log('[login] User logged in successfully');
  return res;
}

