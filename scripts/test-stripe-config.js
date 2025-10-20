#!/usr/bin/env node

/**
 * Script de diagnóstico para verificar la configuración de Stripe en Vendure
 * Ejecuta: node scripts/test-stripe-config.js
 */

const VENDURE_API = 'http://localhost:3000/shop-api';

async function fetchGraphQL(query, variables = {}) {
  const response = await fetch(VENDURE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  return response.json();
}

async function testVendureConnection() {
  console.log('🔍 Testing Vendure connection...');
  try {
    const result = await fetchGraphQL(`
      query {
        __typename
      }
    `);
    
    if (result.data) {
      console.log('✅ Vendure is running and accessible\n');
      return true;
    } else {
      console.log('❌ Vendure returned an error:', result.errors, '\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot connect to Vendure:', error.message);
    console.log('   Make sure Vendure is running on http://localhost:3000\n');
    return false;
  }
}

async function testStripePluginInstalled() {
  console.log('🔍 Checking if StripePlugin is installed...');
  try {
    const result = await fetchGraphQL(`
      query {
        __type(name: "Mutation") {
          fields {
            name
          }
        }
      }
    `);
    
    const mutations = result.data?.__type?.fields?.map(f => f.name) || [];
    const hasStripe = mutations.includes('createStripePaymentIntent');
    
    if (hasStripe) {
      console.log('✅ StripePlugin is installed (createStripePaymentIntent mutation exists)\n');
      return true;
    } else {
      console.log('❌ StripePlugin is NOT installed');
      console.log('   The mutation "createStripePaymentIntent" does not exist');
      console.log('   Action: Install @vendure/payments-plugin and configure StripePlugin\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking mutations:', error.message, '\n');
    return false;
  }
}

async function testPaymentMethods() {
  console.log('🔍 Checking configured Payment Methods...');
  try {
    const result = await fetchGraphQL(`
      query {
        paymentMethods {
          id
          code
          name
          handler {
            code
          }
        }
      }
    `);
    
    const paymentMethods = result.data?.paymentMethods || [];
    const stripeMethod = paymentMethods.find(pm => 
      pm.handler.code === 'stripe' || pm.code.includes('stripe')
    );
    
    if (stripeMethod) {
      console.log('✅ Stripe Payment Method is configured');
      console.log('   ID:', stripeMethod.id);
      console.log('   Code:', stripeMethod.code);
      console.log('   Name:', stripeMethod.name, '\n');
      return true;
    } else {
      console.log('❌ No Stripe Payment Method found');
      console.log('   Available methods:', paymentMethods.map(pm => pm.code).join(', '));
      console.log('   Action: Create a Payment Method in Vendure Admin with Stripe handler\n');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking payment methods:', error.message, '\n');
    return false;
  }
}

async function testCreatePaymentIntent() {
  console.log('🔍 Testing createStripePaymentIntent mutation...');
  console.log('   (This will fail if there\'s no active order, which is expected)\n');
  
  try {
    const result = await fetchGraphQL(`
      mutation {
        createStripePaymentIntent
      }
    `);
    
    if (result.errors) {
      // Analyze the error to determine the issue
      const errorMsg = result.errors[0]?.message || '';
      
      if (errorMsg.includes('No Order with the code')) {
        console.log('✅ Mutation works! (Error is expected - no test order exists)');
        console.log('   The mutation is accessible and will work with a real order\n');
        return true;
      } else if (errorMsg.includes('No eligible PaymentMethod')) {
        console.log('❌ Payment Method not properly configured');
        console.log('   Error:', errorMsg);
        console.log('   Action: Check Payment Method configuration in Admin\n');
        return false;
      } else if (errorMsg.includes('API key')) {
        console.log('❌ Stripe API key is invalid or not configured');
        console.log('   Error:', errorMsg);
        console.log('   Action: Update Stripe API key in Payment Method\n');
        return false;
      } else {
        console.log('⚠️  Unexpected error:', errorMsg);
        console.log('   This might indicate a configuration issue\n');
        return false;
      }
    } else {
      console.log('✅ Mutation executed successfully!\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Error testing mutation:', error.message, '\n');
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   Stripe + Vendure Configuration Diagnostic       ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const results = {
    connection: await testVendureConnection(),
    plugin: false,
    paymentMethod: false,
    mutation: false,
  };

  if (results.connection) {
    results.plugin = await testStripePluginInstalled();
    results.paymentMethod = await testPaymentMethods();
    results.mutation = await testCreatePaymentIntent();
  }

  console.log('═══════════════════════════════════════════════════');
  console.log('                    SUMMARY                         ');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('Vendure Connection:', results.connection ? '✅' : '❌');
  console.log('StripePlugin Installed:', results.plugin ? '✅' : '❌');
  console.log('Payment Method Configured:', results.paymentMethod ? '✅' : '❌');
  console.log('Mutation Working:', results.mutation ? '✅' : '❌');

  const allPassed = Object.values(results).every(r => r);

  console.log('\n═══════════════════════════════════════════════════\n');

  if (allPassed) {
    console.log('🎉 SUCCESS! Stripe is properly configured in Vendure');
    console.log('   You should now be able to complete checkout\n');
    process.exit(0);
  } else {
    console.log('⚠️  ISSUES FOUND! Please fix the errors above');
    console.log('   See VENDURE_STRIPE_SETUP.md for detailed instructions\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

