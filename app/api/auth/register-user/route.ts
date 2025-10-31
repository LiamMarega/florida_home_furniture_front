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

  // Llamar a Vendure
  const result = await fetchGraphQL(
    {
      query: REGISTER_CUSTOMER_ACCOUNT,
      variables: { input },
    },
    { req }
  );

  console.log('[register-user] Vendure response:', JSON.stringify(result, null, 2));

  // Manejo de errores
  if (result.errors?.length) {
    console.error('[register-user] GraphQL errors:', result.errors);
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  const resData = result.data?.registerCustomerAccount;
  if (resData?.__typename === 'ErrorResult') {
    console.warn('[register-user] Vendure returned error result:', resData);
    return NextResponse.json({ error: resData }, { status: 400 });
  }

  const res = NextResponse.json({ success: true });
  // Propagar cookies si las hay
  for (const c of result.setCookies ?? []) res.headers.append('Set-Cookie', c);

  console.log('[register-user] Registration success');
  return res;
}

