# Arquitectura del Sistema

## Visión General

El sistema Facebook Ads Analytics Dashboard está diseñado como una aplicación modular que extrae, procesa y visualiza datos de campañas publicitarias de Facebook.

## Componentes Principales

### 1. Capa de Extracción de Datos

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────┐
│  Facebook Ads   │────▶│   Airbyte   │────▶│  PostgreSQL  │
│      API        │     │   (ETL)     │     │              │
└─────────────────┘     └─────────────┘     └──────────────┘
```

**Airbyte**
- Orquesta la extracción de datos desde Facebook Ads API
- Maneja la autenticación y renovación de tokens
- Realiza transformaciones básicas
- Gestiona reintentos y manejo de errores
- Sincronización incremental cada 2 horas

### 2. Capa de Almacenamiento

**PostgreSQL**
- Base de datos principal para datos estructurados
- Esquema optimizado para consultas analíticas
- Particionamiento por fecha para métricas históricas
- Índices estratégicos para performance

**Redis**
- Cache de consultas frecuentes
- Almacenamiento de sesiones
- Cola de tareas para procesamiento asíncrono
- TTL de 15 minutos para datos de dashboard

### 3. Capa de Procesamiento (Backend)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Express    │────▶│  Business    │────▶│   Database   │
│   Routes     │     │   Logic      │     │   Access     │
└──────────────┘     └──────────────┘     └──────────────┘
```

**API REST (Node.js/Express)**
- Endpoints para métricas y KPIs
- Autenticación JWT
- Rate limiting por IP
- Validación de datos
- Manejo centralizado de errores

**Servicios Core**
- `MetricsService`: Cálculo de KPIs y agregaciones
- `AlertService`: Monitoreo y notificaciones
- `ReportService`: Generación de reportes
- `CacheService`: Gestión de cache Redis

### 4. Capa de Presentación (Frontend)

**Next.js Dashboard**
- Server-side rendering para performance inicial
- Client-side routing para navegación fluida
- Componentes React reutilizables
- Estado global con Context API
- WebSockets para actualizaciones en tiempo real

## Flujo de Datos

### 1. Ingesta de Datos
```
Facebook API → Airbyte → PostgreSQL Raw Tables → Processing Jobs → Analytics Tables
```

### 2. Consulta de Datos
```
Frontend Request → API Endpoint → Cache Check → Database Query → Response
```

### 3. Actualizaciones en Tiempo Real
```
Database Change → Trigger → WebSocket Server → Connected Clients
```

## Patrones de Diseño

### Repository Pattern
```javascript
class CampaignRepository {
  async findByAccountId(accountId) {
    // Abstracción de acceso a datos
  }
}
```

### Service Layer
```javascript
class MetricsService {
  async calculateROAS(campaignId, dateRange) {
    // Lógica de negocio
  }
}
```

### Factory Pattern
```javascript
class ChartDataFactory {
  static create(type, data) {
    // Creación de datos para diferentes tipos de gráficas
  }
}
```

## Escalabilidad

### Horizontal
- Backend stateless permite múltiples instancias
- Load balancer en Nginx
- Redis compartido para sesiones

### Vertical
- Índices de base de datos optimizados
- Queries paginadas
- Lazy loading en frontend

## Seguridad

### Autenticación y Autorización
- JWT tokens con expiración
- Refresh tokens seguros
- Roles y permisos granulares

### Protección de Datos
- Encriptación en tránsito (HTTPS)
- Sanitización de inputs
- Prepared statements para SQL
- Variables de entorno para secrets

## Monitoreo

### Logs
- Winston para logging estructurado
- Niveles: ERROR, WARN, INFO, DEBUG
- Rotación diaria de logs

### Métricas
- Response time por endpoint
- Tasa de errores
- Uso de recursos (CPU, RAM)
- Queries lentas en PostgreSQL

### Alertas
- Email para errores críticos
- Webhook para Slack/Discord
- Dashboard de salud del sistema

## Decisiones Técnicas

### ¿Por qué Airbyte?
- Conectores pre-construidos para Facebook Ads
- Manejo robusto de errores
- UI para configuración sin código
- Open source con comunidad activa

### ¿Por qué PostgreSQL?
- Excelente para datos analíticos
- Soporte para JSON cuando necesario
- Window functions para cálculos complejos
- Maduro y estable

### ¿Por qué Next.js?
- SEO no crítico pero SSR mejora performance
- API routes para BFF pattern
- Optimización automática de assets
- Excelente DX (Developer Experience)

## Diagrama de Despliegue

```
┌─────────────────── Easypanel Server ────────────────────┐
│                                                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │ Nginx   │  │Frontend │  │Backend  │  │Airbyte  │   │
│  │ Proxy   │  │ :3000   │  │ :4000   │  │ :8000   │   │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │
│       │            │            │            │          │
│       └────────────┴────────────┴────────────┘         │
│                         │                               │
│                    ┌────┴────┐                          │
│                    │ Network │                          │
│                    └────┬────┘                          │
│                         │                               │
│  ┌──────────┐     ┌────┴────┐     ┌──────────┐       │
│  │PostgreSQL│     │ Redis   │     │ Volumes  │       │
│  │  :5432   │     │ :6379   │     │          │       │
│  └──────────┘     └─────────┘     └──────────┘       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Próximos Pasos

1. Implementar circuit breakers para servicios externos
2. Añadir GraphQL para queries más flexibles
3. Implementar CDC (Change Data Capture) para real-time
4. Añadir soporte para Google Ads y LinkedIn Ads