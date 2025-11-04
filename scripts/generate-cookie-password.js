#!/usr/bin/env node

// Generate a secure cookie password for WorkOS
const crypto = require('crypto')

const password = crypto.randomBytes(32).toString('base64')
console.log('\n✅ Generated secure cookie password:')
console.log(password)
console.log('\n📋 Copy this value and use it for WORKOS_COOKIE_PASSWORD in Vercel\n')

