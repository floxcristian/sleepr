- Capa gateway que usará SAGA para llamar a multiples dominios (microservicios) y entregar una sola información.
- Habrá otra API HEADLESS para comunicación con ERP.

# 1. API Layer (Pública)

### Balanceador

### API Layer
- Podemos usar Cloud Run o Kubernetes para desplegar los servicios.
- Se recomienda usar Cloud Run porque:
    - Esta capa Layer generalmente son servicios headless (no guardan estado).
    - Funcionan casi como un proxy.
    - Es muy fácil de administrar, escalar y mantener.
### VPC

# 2. Core Commerce Layer

- Capacidades del Ecommerce (productos, precios, carrito, etc).
- Responsabilidades:
    - Dominios bien definidos y desacoplados.
    - Maneja toda la lógica de negocio.
    - Comunicación hacia los servicios legados.
    - Operación corporativa o por país.
    - Cache a nivel de dominio.
- Seguridad mejorada:
    - El dominio completo no esta expuesto a internet.
    - Dominios poseen rutas públicas y privadas.
- Mejoras en los procesos de desarrollo.
