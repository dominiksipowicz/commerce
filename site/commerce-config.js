/**
 * This file is expected to be used in next.config.js only
 */

const path = require('path')
const fs = require('fs')
const merge = require('deepmerge')
const prettier = require('prettier')
const core = require('@vercel/commerce/config')

const PROVIDERS = [
  '@vercel/commerce-local',
  'bigcommerce',
  'saleor',
  'shopify',
  'swell',
  'vendure',
  'ordercloud',
  'kibocommerce',
  'spree',
  'commercejs',
]

function getProviderName() {
  return (
    process.env.COMMERCE_PROVIDER ||
    (process.env.BIGCOMMERCE_STOREFRONT_API_URL
      ? 'bigcommerce'
      : process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN
      ? 'shopify'
      : process.env.NEXT_PUBLIC_SWELL_STORE_ID
      ? 'swell'
      : '@vercel/commerce-local')
  )
}

function withCommerceConfig(nextConfig = {}) {
  const config = merge(
    { commerce: { provider: getProviderName() } },
    nextConfig
  )
  const { commerce } = config
  const { provider } = commerce

  if (!provider) {
    throw new Error(
      `The commerce provider is missing, please add a valid provider name or its environment variables`
    )
  }
  if (!PROVIDERS.includes(provider)) {
    throw new Error(
      `The commerce provider "${provider}" can't be found, please use one of "${PROVIDERS.join(
        ', '
      )}"`
    )
  }

  // Update paths in `tsconfig.json` to point to the selected provider
  if (commerce.updateTSConfig !== false) {
    const tsconfigPath = path.join(
      process.cwd(),
      commerce.tsconfigPath || 'tsconfig.json'
    )
    const tsconfig = require(tsconfigPath)
    // The module path is a symlink in node_modules
    // -> /node_modules/[name]/dist/index.js
    const absolutePath = require.resolve(provider)
    // but we want references to go to the real path in /packages instead
    // -> packages/[name]/dist/index.js
    const relativePath = path.relative(process.cwd(), absolutePath)
    // -> /packages/[name]/src
    const modulePath = path.join(relativePath, '../../src')

    tsconfig.compilerOptions.paths['@framework'] = [`${modulePath}`]
    tsconfig.compilerOptions.paths['@framework/*'] = [`${modulePath}/*`]

    fs.writeFileSync(
      tsconfigPath,
      prettier.format(JSON.stringify(tsconfig), { parser: 'json' })
    )
  }

  return core.withCommerceConfig(config)
}

module.exports = { withCommerceConfig, getProviderName }
