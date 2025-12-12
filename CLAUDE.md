# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Shopify theme called "Satoshi" (v7.0.0) developed by Scandiweb for the Petsetgo pet store. It uses Shopify's Liquid templating system with modern JavaScript and CSS/SCSS for styling. The theme is specifically designed for pet products with extensive metafields for animal types, breed sizes, materials, and pet-specific attributes.

## Architecture & Key Components

### Theme Structure
- **Templates** (`templates/`): Page templates for different page types (product, collection, cart, etc.)
- **Sections** (`sections/`): Reusable components that can be customized via Shopify's theme editor
- **Snippets** (`snippets/`): Reusable code fragments, especially product-related components
- **Assets** (`assets/`): JavaScript, CSS, images, and other static files
- **Config** (`config/`): Theme settings and schema files
- **Layout** (`layout/`): Base layout templates

### Key Files & Systems
- `layout/theme.liquid`: Main layout file with HTML structure, meta tags, and asset loading
- `assets/app.js`: Main JavaScript entry point
- `assets/app.css`: Main CSS entry point
- `config/settings_schema.json`: Theme customizer settings definition
- `.shopify/metafields.json`: Custom metafields for products, collections, and shop

### Product Components
- `snippets/product-details.liquid`: Product details display
- `snippets/product-options.liquid`: Variant selection and options
- `snippets/product-gallery-mobile.liquid`: Mobile product gallery
- `sections/main-product.liquid`: Main product page section

### JavaScript Libraries
- Alpine.js 3.14.0 for reactive components
- Swiper for carousels and sliders
- Custom modules for product galleries, announcement bars, and shop-the-look functionality

## Shopify-Specific Features

### Custom Metafields
The theme uses extensive custom metafields defined in `.shopify/metafields.json`:

#### Product Metafields (`product` namespace):
- **Material & Fabric**: `custom.material`, `shopify.material`, `shopify.fabric` for product composition
- **Pet-Specific**: `shopify.animal-type`, `shopify.suitable-for-breed-size`, `shopify.dog-toy-type`
- **Visual Attributes**: `shopify.color-pattern`, `shopify.accessory-size`, `scraft.custom_badge`
- **Product Info**: `custom.details_care`, `custom.product_description`, `custom.product_faq`, `custom.size_chart`
- **Coupons**: `custom.product_coupon_code`, `custom.product_coupon_text`, `custom.product_coupon_codes`, `custom.product_coupon_texts`
- **Variant Features**: `scraft.swatch_enabled_variants`, `scraft.swatch_method`, `variant.breed_info`
- **Integrations**: `custom.binkit_url` (Binkit integration), `reviews.rating`, `reviews.rating_count`
- **Shopify Discovery**: `shopify--discovery--product_search_boost.queries`, related/complementary products

#### Collection Metafields (`collection` namespace):
- **Featured Collections**: 10 featured collections with images and text (`featured_collection_1` through `featured_collection_10`)
- **Collection Banners**: `custom.banner_image` for top banner images
- **Visual Assets**: `logo_list.f_c_i_1`, `logo_list.f_c_i_2` for logo list functionality

#### Shop Metafields (`shop` namespace):
- **Fast Bundle**: `rbrfb.fastbundleconf` for bundle widget configuration

### Navigation Type
Supports both Multi-Page Application (MPA) and Single-Page Application (SPA) navigation modes, configurable via theme settings.

### Responsive Design
Mobile-first approach with dedicated mobile components and layouts, especially for product galleries.

## Development Workflow

### Shopify Theme Development
This is a native Shopify theme without a traditional Node.js build system. Development involves:
- **Local development**: Use Shopify CLI (`shopify theme dev`) for local development with hot reload
- **Deployment**: Push changes via Shopify CLI (`shopify theme push`) or through the Shopify Theme Editor
- **Testing**: Test in different browsers and devices using Shopify's preview functionality
- **Version control**: Git commits are synced with Shopify's theme versioning

### Common Development Commands
```bash
# Start local development server with hot reload
shopify theme dev

# Start development with specific store and live-reload
shopify theme dev --store your-store.myshopify.com --live-reload

# Push changes to remote theme
shopify theme push

# Push only specific files (faster for small changes)
shopify theme push --path assets/app.css

# Pull latest theme changes
shopify theme pull

# Pull theme settings and data
shopify theme pull --theme your-theme-id

# Create a new theme version
shopify theme push --publish --name "New version name"

# Check theme performance
shopify theme check

# Generate theme preview link
shopify theme share

# Remove local development files
shopify theme delete --local

# Deploy specific environment
shopify theme push --theme production-theme-id

# Preview specific page locally
shopify theme dev --store your-store.myshopify.com
```

### Theme Configuration
- Theme settings: `config/settings_schema.json` defines customizer options
- Theme data: `config/settings_data.json` stores current theme settings
- Metafields: `.shopify/metafields.json` defines custom metafields for products, collections, and shop
- Localization: `locales/en.default.json` for text translations

### Asset Pipeline
- CSS/JS files are served directly through Shopify's CDN
- No compilation step required - assets are deployed as-is
- Use `{{ 'asset.css' | asset_url }}` in Liquid templates to reference assets
- Alpine.js 3.14.0 and Swiper are included as third-party libraries

## Development Architecture

### Theme System Overview
- **Layout**: `layout/theme.liquid` serves as the main template with Alpine.js initialization
- **Entry Points**: `assets/app.js` and `assets/app.css` are the main JavaScript and CSS bundles
- **Component Model**: Sections (customizable via theme editor) and Snippets (reusable fragments)
- **Navigation**: Supports both MPA (Multi-Page Application) and SPA modes via theme settings

### JavaScript Architecture
- **Alpine.js 3.14.0**: Main reactive framework for interactive components
- **State Management**: Alpine stores for cart, popup, and navigation state
- **Key Stores**: `$store.main` (global state), `$store.cart` (cart operations), `$store.popup` (modal management), `$store.transition` (navigation transitions)
- **Custom Modules**: Product galleries, announcement bars, shop-the-look functionality
- **No Build Step**: Assets served directly through Shopify CDN
- **Persistence**: Custom Alpine persist plugin for local storage functionality
- **Product Data**: Variant management, stock checking, and real-time option updates

### CSS Architecture
- **Tailwind CSS**: Utility-first approach with custom design tokens
- **Mobile-First**: Responsive breakpoints starting from mobile
- **Component Isolation**: Scoped CSS files for specific features
- **Design System**: Consistent spacing, colors, and typography

### Data Flow
1. **Liquid Rendering**: Server-side template processing with Shopify data
2. **Metafields**: Custom product/collection attributes defined in `.shopify/metafields.json`
3. **Client State**: Alpine.js manages reactive UI state
4. **API Integration**: Cart and checkout operations via Shopify AJAX API

## Common Development Tasks

### Modifying Product Display
- Product details: `snippets/product-details.liquid`
- Product options/variants: `snippets/product-options.liquid`
- Product gallery: `snippets/product-gallery-mobile.liquid` and related assets

### Adding New Sections
Create files in `sections/` directory following Shopify's section schema structure with `{% schema %}` blocks.

### Theme Customization
- Theme colors and fonts: Configure via Shopify admin theme editor
- Layout changes: Modify `layout/theme.liquid`
- Component behavior: Update corresponding section or snippet files

### Asset Management
- CSS edits: `assets/app.css` or create new CSS files
- JavaScript edits: `assets/app.js` or create new JS modules
- Always reference new assets using Shopify's `asset_url` filter

## Petsetgo-Specific Features

### Pet-Centric Metafields
The theme uses extensive custom metafields for pet store functionality:
- **Products**: Materials, breed info, color patterns, animal types, custom badges, product FAQs, coupon codes
- **Collections**: Featured collection images and text (up to 10 collections)
- **Shop**: Fast Bundle configuration for product bundling

### Specialized Components
- **Mobile Product Gallery**: Touch-optimized product image gallery with zoom functionality
- **Product Options**: Custom variant selection with real-time stock checking
- **Announcement Bar**: Sliding announcements with Alpine.js reactivity
- **Shop the Look**: Interactive product bundling and cross-selling features

## File Naming Conventions
- Liquid files use kebab-case (e.g., `product-details.liquid`)
- Section files correspond to component names (e.g., `main-product.liquid`)
- Asset files use standard web conventions (app.js, app.css)

## Key Technologies & Libraries

### Frontend Framework
- **Alpine.js 3.14.0**: Reactive JavaScript components for interactive UI
- **Tailwind CSS**: Utility-first CSS framework (based on classes in app.css)
- **Swiper**: Carousel and slider functionality

### Shopify Integration
- **Custom metafields**: Extensive use of product and collection metafields for pet-specific attributes
- **Variant selection**: Custom product option handling with stock checking
- **Mobile galleries**: Dedicated mobile product gallery with touch support
- **Fast Bundle integration**: Third-party app configuration via metafields

### Navigation Modes
- **MPA (Multi-Page Application)**: Traditional page navigation with transitions
- **SPA (Single-Page Application)**: Client-side navigation controlled by theme settings

## Debugging & Troubleshooting

### Alpine.js Debugging
- Use `Alpine.store()` in browser console to inspect store state
- `document.querySelector('[x-data]')` to find Alpine components
- Check `console.log` in browser dev tools for Alpine initialization errors

### Theme Development Issues
- **Hot reload not working**: Check if Shopify CLI is running and port is available
- **Missing styles**: Verify asset URLs using `{{ 'asset.css' | asset_url }}`
- **JavaScript errors**: Check browser console for Alpine.js initialization issues
- **Metafields not appearing**: Verify metafield definitions in `.shopify/metafields.json`
- **Variant selection issues**: Check Alpine store data and variant availability

### Common Debug Locations
- Product variant data: `layout/theme.liquid:109-113` (Alpine initialization)
- Navigation transitions: `layout/theme.liquid:157-162` (main content wrapper)
- Fallback templates: `layout/theme.liquid:132-143` (SPA fallbacks)
- Cart state: `$store.cart.cartType` and `$store.cart.cartUrl` initialization

## File Organization & Best Practices

### Asset Structure
- **Main Assets**: `assets/app.js` and `assets/app.css` are entry points
- **Third-party Libraries**: `alpine.3.14.0.min.js`, `swiper-bundle.min.js/css`
- **Feature-specific**: `product-gallery-mobile.*`, `announcement-bar-slider.*`, `shop-the-look-custom.js`

### Section Organization
- **Page Templates**: `main-*.liquid` files (main-product, main-collection, main-cart, etc.)
- **Reusable Components**: `header.liquid`, `footer.liquid`, `featured-collection.liquid`
- **Interactive Elements**: `carousel-slides.liquid`, `accordion.liquid`, `countdown-timer.liquid`

### Snippet Hierarchy
- **Product System**: `product-details.liquid`, `product-options.liquid`, `product-gallery-mobile.liquid`
- **Product Actions**: `product-actions.liquid`, `product-actions-button.liquid`, `product-actions-in-cart.liquid`
- **Product Display**: `product-details-info.liquid`, `product-marquee.liquid`, `product-options-popup.liquid`

### Development Best Practices
- **Alpine.js Integration**: Initialize product data in `sections/main-product.liquid:6-20`
- **Responsive Design**: Mobile-first with dedicated mobile components
- **Performance**: Preload critical images in `layout/theme.liquid:69-88`
- **Accessibility**: Skip links, ARIA labels, keyboard navigation support
- **Theme Editor**: All sections include `{% schema %}` blocks for customization
- **SEO**: Proper meta tags, structured data, and semantic HTML structure