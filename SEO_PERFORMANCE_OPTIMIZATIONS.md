# SEO & Performance Optimizations

## 🚀 Optimizaciones Implementadas

### 1. **Header Inteligente y Adaptativo**

El componente `Header` ahora detecta automáticamente en qué página está usando `usePathname()`:

- **Página Principal (`/`)**: Header transparente y absoluto con padding superior
- **Páginas de Productos (`/products/[slug]`)**: Header fixed con fondo semi-transparente
- **Otras páginas internas**: Header fixed después del scroll
- **Transiciones suaves**: Animaciones de 300ms para cambios de estado
- **Scroll optimization**: Event listener con `passive: true` para mejor rendimiento

```typescript
const isProductPage = pathname?.startsWith('/products/') && pathname !== '/products';
const isInternalPage = pathname !== '/' || scrolled;
const shouldBeFixed = isProductPage || isInternalPage;
```

---

### 2. **Metadata SEO Avanzado**

#### Layout Raíz (`app/layout.tsx`)
- ✅ **Title Template**: Títulos dinámicos con formato consistente
- ✅ **Robots Meta**: Configuración completa para GoogleBot
- ✅ **Open Graph**: Metadata social completa
- ✅ **Twitter Cards**: Optimización para compartir en Twitter
- ✅ **Apple Web App**: Configuración para iOS
- ✅ **Authors & Publisher**: Información de autoría

#### Páginas de Productos (`app/products/[slug]/page.tsx`)
- ✅ **Dynamic SEO**: Metadata generada desde Vendure
- ✅ **Canonical URLs**: URLs canónicas para evitar contenido duplicado
- ✅ **Rich Descriptions**: Descripciones con precio y llamada a la acción
- ✅ **Social Images**: Open Graph images desde Vendure
- ✅ **404 Handling**: Metadata específica para productos no encontrados con `noindex`

---

### 3. **Optimizaciones de Rendimiento CSS**

#### `app/globals.css`
```css
/* Content Visibility API para lazy rendering de imágenes */
img {
  content-visibility: auto;
}

/* Scroll suave para mejor UX */
html {
  scroll-behavior: smooth;
}

/* Respeto a preferencias de accesibilidad */
@media (prefers-reduced-motion: reduce) {
  /* Desactiva animaciones para usuarios sensibles */
}
```

---

### 4. **Next.js Config Optimizado**

#### `next.config.js`
```javascript
// Optimizaciones clave:
✅ reactStrictMode: true           // Detecta problemas en desarrollo
✅ swcMinify: true                 // Minificación ultrarrápida
✅ removeConsole en producción     // Elimina console.logs en build
✅ Image optimization              // AVIF y WebP automáticos
✅ Package imports optimization    // Reduce bundle size
✅ Security Headers                // Headers HTTP seguros
✅ Remote Patterns                 // Soporte para imágenes de Vendure
```

**Formatos de Imagen Modernos:**
- AVIF (mejor compresión, ~50% más pequeño que JPEG)
- WebP (fallback, excelente soporte)
- Device sizes optimizados para responsive

---

### 5. **SEO Automático: Robots y Sitemap**

#### `app/robots.ts`
- ✅ Permite crawling de todo el sitio
- ✅ Bloquea rutas internas (`/api/`, `/test-vendure/`, etc.)
- ✅ Referencia automática al sitemap

#### `app/sitemap.ts`
- ✅ **Sitemap Dinámico**: Generado automáticamente desde Vendure
- ✅ **Prioridades SEO**: 
  - Homepage: `priority: 1`
  - Productos listing: `priority: 0.9`
  - Productos individuales: `priority: 0.8`
- ✅ **Change Frequency**: Configurado según tipo de contenido
- ✅ **Last Modified**: Usa timestamps reales de Vendure
- ✅ **Error Handling**: Fallback a páginas estáticas si falla

---

### 6. **Spacing y Layout Consistente**

Todas las páginas internas ahora tienen espaciado superior correcto:

| Página | Clase | Propósito |
|--------|-------|-----------|
| `/products/[slug]` | `pt-32` | Evita overlap con header fixed |
| `/products` | `pt-32` | Consistencia en listado |
| `/products/[slug]/loading.tsx` | `pt-32` | Loading state matching |
| `/products/[slug]/not-found.tsx` | `pt-20` | 404 centrado correctamente |
| `/test-vendure` | `pt-32` | Página de testing |

---

## 📊 Impacto Esperado en Rendimiento

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: 
  - ✅ Image optimization (AVIF/WebP)
  - ✅ Content-visibility para lazy rendering
  - ✅ Font display swap

- **FID (First Input Delay)**: 
  - ✅ Event listeners passive
  - ✅ Código minificado
  - ✅ Package imports optimizados

- **CLS (Cumulative Layout Shift)**: 
  - ✅ Spacing consistente
  - ✅ Aspect ratios en imágenes
  - ✅ Font display swap

### SEO
- **Crawlability**: ⭐⭐⭐⭐⭐ (Sitemap + Robots.txt)
- **Mobile-First**: ⭐⭐⭐⭐⭐ (Responsive + Touch optimized)
- **Social Sharing**: ⭐⭐⭐⭐⭐ (OG + Twitter Cards)
- **Canonical URLs**: ⭐⭐⭐⭐⭐ (Evita duplicados)
- **Structured Data**: ⚠️ *Próximamente* (JSON-LD para productos)

---

## 🎯 Próximas Optimizaciones Recomendadas

### 1. **JSON-LD Structured Data**
```typescript
// Agregar en ProductPage para Rich Snippets
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": product.name,
  "image": product.featuredAsset.preview,
  "description": product.description,
  "offers": {
    "@type": "Offer",
    "price": variant.priceWithTax / 100,
    "priceCurrency": variant.currencyCode
  }
}
```

### 2. **Service Worker para PWA**
- Offline support
- Cached navigation
- Install prompt

### 3. **Analytics & Monitoring**
- Google Analytics 4
- Google Search Console
- Core Web Vitals monitoring
- Error tracking (Sentry)

### 4. **Image Optimization Avanzada**
- Blur placeholders para imágenes
- Lazy loading con IntersectionObserver
- Responsive images con srcSet

### 5. **Preload & Prefetch**
```typescript
// En layout.tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://your-vendure-api.com" />
```

---

## 📈 Métricas de Éxito

Después del deploy, monitorear:

1. **Google PageSpeed Insights**: Target > 90 en mobile y desktop
2. **Google Search Console**: 
   - Coverage (páginas indexadas)
   - Core Web Vitals
   - Mobile Usability
3. **Lighthouse CI**: Scores consistentes > 95
4. **Real User Monitoring**: Core Web Vitals de usuarios reales

---

## 🛠️ Comandos Útiles

```bash
# Build optimizado para producción
npm run build

# Analizar bundle size
npm run build -- --profile

# Preview de producción local
npm run start

# Verificar sitemap
curl http://localhost:3001/sitemap.xml

# Verificar robots.txt
curl http://localhost:3001/robots.txt
```

---

## ✅ Checklist de Deploy

Antes de producción:

- [ ] Configurar `NEXT_PUBLIC_SITE_URL` en variables de entorno
- [ ] Agregar dominio de Vendure en `remotePatterns`
- [ ] Verificar que `unoptimized: false` en producción
- [ ] Configurar Google Search Console
- [ ] Enviar sitemap a Google
- [ ] Configurar Analytics
- [ ] Test en Lighthouse (modo incógnito)
- [ ] Verificar meta tags con herramientas:
  - https://www.opengraph.xyz/
  - https://cards-dev.twitter.com/validator

---

**Última actualización**: Octubre 2025
**Documentación mantenida por**: Florida Homes Furniture Dev Team

