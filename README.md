# Facebook Ads Analytics Dashboard

Sistema completo de análisis y visualización de datos de Facebook Ads con pipeline automatizado.

## 📋 Descripción

Plataforma web que extrae datos de Facebook Ads mediante Airbyte, los almacena en PostgreSQL y presenta dashboards interactivos con métricas clave para optimizar campañas publicitarias.

## 🏗 Arquitectura

- **ETL**: Airbyte para extracción de datos de Facebook Ads API
- **Base de Datos**: PostgreSQL para almacenamiento
- **Backend**: Node.js/Express API
- **Frontend**: Next.js con gráficas interactivas
- **Infraestructura**: Easypanel (Docker)

## 📁 Estructura del Proyecto

```
facebook-ads-dashboard/
├── docs/              # Documentación detallada
├── backend/           # API Node.js
├── frontend/          # Dashboard Next.js
├── database/          # Scripts SQL y migraciones
├── airbyte/           # Configuración Airbyte
├── docker/            # Dockerfiles y compose
└── README.md          # Este archivo
```

## 🚀 Quick Start

1. Clonar repositorio
2. Configurar variables de entorno
3. Deploy en Easypanel
4. Configurar Airbyte connection

## 📚 Documentación

- [Arquitectura del Sistema](./docs/01-arquitectura.md)
- [Configuración Easypanel](./docs/02-easypanel-setup.md)
- [Modelo de Datos](./docs/03-modelo-datos.md)
- [API Documentation](./docs/04-api.md)
- [Frontend Guide](./docs/05-frontend.md)

## 🛠 Stack Tecnológico

- Node.js + Express
- Next.js 14
- PostgreSQL
- Redis
- Airbyte
- Docker
- Easypanel

## 📊 Características

- ✅ Sincronización automática con Facebook Ads
- ✅ Dashboard en tiempo real
- ✅ Análisis multi-cuenta
- ✅ Sistema de alertas
- ✅ Exportación de reportes
- ✅ Gráficas interactivas
- ✅ Histórico de métricas

## 🔧 Desarrollo

```bash
# Desarrollo local
cd facebook-ads-dashboard
docker-compose up -d

# Backend
cd backend && npm install && npm run dev

# Frontend  
cd frontend && npm install && npm run dev
```

## 📈 Métricas Disponibles

- Impresiones, Alcance, Frecuencia
- CTR, CPC, CPM
- Conversiones y ROAS
- Gasto y presupuesto
- Performance por tiempo
- Análisis de audiencias

## 🔐 Seguridad

- Autenticación JWT
- Variables de entorno para secrets
- HTTPS obligatorio
- Rate limiting

## 📝 Licencia

Privado - Uso interno