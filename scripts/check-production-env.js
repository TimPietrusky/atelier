#!/usr/bin/env node

// Check production environment variables configuration
const requiredVars = {
  WORKOS_API_KEY: {
    required: true,
    prefix: 'sk_live_',
    description: 'WorkOS production API key',
  },
  WORKOS_CLIENT_ID: {
    required: true,
    prefix: 'client_live_',
    description: 'WorkOS production Client ID',
  },
  WORKOS_REDIRECT_URI: {
    required: true,
    pattern: /^https:\/\/.*\/callback$/,
    description: 'Production callback URL',
  },
  WORKOS_COOKIE_PASSWORD: {
    required: true,
    minLength: 32,
    description: 'Secure cookie password (32+ chars)',
  },
  NEXT_PUBLIC_CONVEX_URL: {
    required: true,
    pattern: /^https:\/\/.*\.convex\.cloud$/,
    description: 'Convex production deployment URL',
  },
}

console.log('🔍 Checking production environment variables...\n')

let allValid = true

for (const [varName, config] of Object.entries(requiredVars)) {
  const value = process.env[varName]
  
  if (!value && config.required) {
    console.log(`❌ ${varName}: NOT SET`)
    console.log(`   Required: ${config.description}\n`)
    allValid = false
    continue
  }
  
  if (!value) {
    console.log(`⚠️  ${varName}: NOT SET (optional)\n`)
    continue
  }
  
  // Check prefix
  if (config.prefix && !value.startsWith(config.prefix)) {
    console.log(`❌ ${varName}: Invalid prefix`)
    console.log(`   Expected: ${config.prefix}`)
    console.log(`   Got: ${value.substring(0, config.prefix.length)}`)
    console.log(`   Value: ${value.substring(0, 20)}...\n`)
    allValid = false
    continue
  }
  
  // Check pattern
  if (config.pattern && !config.pattern.test(value)) {
    console.log(`❌ ${varName}: Invalid format`)
    console.log(`   Expected pattern: ${config.pattern}`)
    console.log(`   Value: ${value}\n`)
    allValid = false
    continue
  }
  
  // Check min length
  if (config.minLength && value.length < config.minLength) {
    console.log(`❌ ${varName}: Too short`)
    console.log(`   Required: ${config.minLength}+ characters`)
    console.log(`   Got: ${value.length} characters\n`)
    allValid = false
    continue
  }
  
  // Show masked value
  const masked = value.length > 20 
    ? `${value.substring(0, 20)}...` 
    : value
  console.log(`✅ ${varName}: ${masked}`)
  console.log(`   ${config.description}\n`)
}

if (allValid) {
  console.log('✅ All required environment variables are configured correctly!\n')
  process.exit(0)
} else {
  console.log('❌ Some environment variables are missing or invalid.\n')
  console.log('📋 Make sure to set these in Vercel Dashboard → Settings → Environment Variables\n')
  process.exit(1)
}

