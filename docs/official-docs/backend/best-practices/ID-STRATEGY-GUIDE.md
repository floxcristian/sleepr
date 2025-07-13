# Guía de Estrategia de IDs - MongoDB + APIs Públicas

## 📋 Resumen Ejecutivo

Esta guía establece el patrón **híbrido de identificación** para nuestra aplicación empresarial, utilizando tanto el `_id` nativo de MongoDB como IDs públicos personalizados para optimizar tanto la funcionalidad interna como la experiencia de usuario.

## 🎯 Problema que Resolvemos

### ❌ Problemas con ObjectIds en URLs públicas:

- **UX horrible**: `/stores/507f1f77bcf86cd799439011`
- **Seguridad**: Expone información interna de la base de datos
- **SEO**: URLs no amigables para buscadores
- **Branding**: Imposible crear URLs memorables
- **Usabilidad**: Difícil de copiar, compartir o recordar

### ❌ Problemas de usar solo IDs personalizados:

- **Pérdida de funcionalidad MongoDB**: Replicación, sharding, transacciones
- **Performance**: Sin optimizaciones automáticas de MongoDB
- **Compatibilidad**: Herramientas de MongoDB esperan `_id`

## ✅ Nuestra Solución: Patrón Híbrido

Utilizamos **ambos IDs** con propósitos específicos:

```typescript
// Estructura en MongoDB
{
  _id: ObjectId("507f1f77bcf86cd799439011"),  // Para MongoDB interno
  publicId: "K1PpQh3kX2",                     // Para APIs públicas
  name: "Nike Official Store",
  slug: "nike-official"
}

// Respuesta en API
{
  id: "K1PpQh3kX2",           // Solo el ID amigable
  name: "Nike Official Store",
  slug: "nike-official"
}
```

## 🏗️ Implementación

### 1. Schema Definition

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { nanoid } from 'nanoid';

const generateShortId = () => nanoid(10);

@Schema({
  collection: 'official_stores',
  timestamps: true,
  // Exponer solo el ID público para APIs
  toJSON: {
    transform: function (_, ret) {
      ret.id = ret.publicId; // ID amigable para APIs
      delete ret._id; // Ocultar ObjectId interno
      delete ret.publicId; // Limpiar campo técnico
      delete ret.__v;
      return ret;
    },
  },
})
export class OfficialStoreEntity extends Document {
  @Prop({ type: SchemaTypes.ObjectId })
  _id: Types.ObjectId; // OBLIGATORIO para MongoDB

  @Prop({
    type: String,
    required: true,
    default: generateShortId,
    index: true,
    unique: true,
  })
  publicId: string; // ID amigable para APIs públicas

  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop({ type: String, required: true, unique: true })
  slug: string;

  @Prop({ type: Number, required: false, default: 0 })
  order: number;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const OfficialStoreSchema = SchemaFactory.createForClass(OfficialStoreEntity);
```

### 2. DAO Implementation (Optimizado con Projection)

```typescript
@Injectable()
export class OfficialStoreDao {
  constructor(
    @InjectModel(OfficialStoreEntity.name)
    private officialStoreModel: Model<OfficialStoreEntity>,
  ) {}

  // Método optimizado con projection
  async findAll() {
    return this.officialStoreModel
      .find(
        {},
        {
          _id: 0, // Excluir _id
          __v: 0, // Excluir version
          id: '$publicId', // Alias: id = publicId
          name: 1,
          slug: 1,
          order: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      )
      .lean();
  }

  async findByPublicId(publicId: string) {
    return this.officialStoreModel
      .findOne(
        { publicId },
        {
          _id: 0,
          __v: 0,
          id: '$publicId',
          name: 1,
          slug: 1,
          order: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      )
      .lean();
  }

  async findBySlug(slug: string) {
    return this.officialStoreModel
      .findOne(
        { slug },
        {
          _id: 0,
          __v: 0,
          id: '$publicId',
          name: 1,
          slug: 1,
          order: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      )
      .lean();
  }

  // Para operaciones internas (CMS, agregaciones)
  async findById(id: string) {
    return this.officialStoreModel.findById(id).lean();
  }

  async updateByPublicId(publicId: string, updateData: Partial<OfficialStoreEntity>) {
    return this.officialStoreModel.findOneAndUpdate({ publicId }, updateData, { new: true });
  }
}
```

## 🌐 URLs Resultantes

### Frontend Ecommerce:

- ✅ `https://tienda.com/tiendas/nike-official` (slug - SEO optimizado)
- ✅ `https://tienda.com/stores/K1PpQh3kX2` (ID corto - sharing)

### CMS/Admin:

- ✅ `https://admin.tienda.com/stores/K1PpQh3kX2/edit`

### API Endpoints:

- ✅ `GET /api/v1/official-stores` (lista todas)
- ✅ `GET /api/v1/official-stores/K1PpQh3kX2` (por ID)
- ✅ `PUT /api/v1/official-stores/K1PpQh3kX2` (actualizar)
- ✅ `DELETE /api/v1/official-stores/K1PpQh3kX2` (eliminar)

## 🔧 Por qué Conservamos el `_id` de MongoDB

### Funcionalidades Críticas que Requieren `_id`:

1. **Replicación**: MongoDB sincroniza replica sets usando `_id`
2. **Sharding**: Distribución de datos entre clusters
3. **Transacciones**: Control de concurrencia optimizado
4. **Change Streams**: Tracking de modificaciones en tiempo real
5. **Agregaciones**: `$lookup` y joins optimizados
6. **Índices**: `_id` siempre tiene índice único automático
7. **Herramientas**: MongoDB Compass, CLI, etc.

### Información Útil del ObjectId:

```javascript
const objectId = ObjectId('507f1f77bcf86cd799439011');
objectId.getTimestamp(); // Cuándo se creó el documento
```

## 📊 Comparación con Grandes Empresas

| Empresa         | Patrón de ID           | Ejemplo                | Uso                       |
| --------------- | ---------------------- | ---------------------- | ------------------------- |
| **Stripe**      | Prefijo + Hash         | `cus_1A2B3C4D5E6F7G8H` | APIs públicas             |
| **Slack**       | Prefijo + Alfanumérico | `C1234567890`          | Identificación de canales |
| **GitHub**      | Numérico secuencial    | `123456789`            | Issues, PRs               |
| **Instagram**   | Base64-like            | `BzOyI2sBdGr`          | Posts                     |
| **YouTube**     | Alfanumérico           | `dQw4w9WgXcQ`          | Videos                    |
| **Nuestra App** | nanoid(10)             | `K1PpQh3kX2`           | Recursos públicos         |

## ⚡ Optimización de Performance

### Usar `.lean()` para Máxima Eficiencia:

```typescript
// ❌ Sin optimización
const stores = await this.model.find(); // Documentos Mongoose completos

// ✅ Con optimización
const stores = await this.model.find({}, projection).lean(); // Solo datos necesarios
```

### Projection vs toJSON Transform:

| Aspecto         | Projection + lean() | toJSON Transform |
| --------------- | ------------------- | ---------------- |
| **Performance** | ⚡ Máximo           | 🐌 Menor         |
| **Memoria**     | 💾 Mínima           | 💾 Mayor         |
| **Red**         | 🌐 Menos datos      | 🌐 Más datos     |
| **Automático**  | ❌ Manual           | ✅ Automático    |

## 🎛️ Configuración de nanoid

### Configuración Actual (Recomendada):

```typescript
const generateShortId = () => nanoid(10);
// Genera: K1PpQh3kX2, m9Xz7R2QvB, L4dN8vK3Mn
```

### Análisis de Seguridad:

- **Longitud 10**: ~500 años para 1% probabilidad de colisión
- **Alphabet**: A-Za-z0-9 (62 caracteres)
- **Entropía**: 59.5 bits
- **URL-safe**: Sin caracteres especiales

### Alternativas Según Contexto:

```typescript
// Para alta seguridad
const generateShortId = () => nanoid(12); // 71.4 bits de entropía

// Para máxima legibilidad (sin caracteres ambiguos)
import { customAlphabet } from 'nanoid';
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
const generateShortId = customAlphabet(alphabet, 10);

// Con prefijo (estilo Stripe)
const generateShortId = () => `str_${nanoid(8)}`;
```

## 📋 Checklist de Implementación

### ✅ Schema:

- [ ] `_id` como ObjectId (obligatorio)
- [ ] `publicId` con nanoid y índice único
- [ ] `toJSON` transform para APIs limpias
- [ ] Campos de negocio (name, slug, etc.)

### ✅ DAO:

- [ ] Métodos con projection para eficiencia
- [ ] `findByPublicId()` para APIs públicas
- [ ] `findById()` para operaciones internas
- [ ] `findBySlug()` para URLs SEO
- [ ] Usar `.lean()` en todas las consultas

### ✅ Controller:

- [ ] Endpoints usando `publicId`
- [ ] Validación de formato de ID
- [ ] Manejo de errores 404

### ✅ Frontend:

- [ ] URLs usando slug o publicId
- [ ] Sin exposición de `_id` interno

## 🚨 Errores Comunes a Evitar

### ❌ No hacer esto:

```typescript
// NO exponer _id interno
return { id: store._id.toString() };

// NO usar solo IDs personalizados sin _id
@Schema({ _id: false }) // ¡NUNCA!

// NO usar toJSON si priorizas performance
// Mejor usar projection + lean()

// NO usar IDs muy cortos para alta concurrencia
const generateShortId = () => nanoid(4); // Muy corto
```

### ✅ Hacer esto:

```typescript
// Exponer solo publicId
return { id: store.publicId };

// Mantener _id siempre
@Schema({ timestamps: true }) // _id automático

// Usar projection para performance
.find({}, { _id: 0, id: '$publicId', name: 1 }).lean()

// Longitud adecuada para el contexto
const generateShortId = () => nanoid(10); // Balance perfecto
```

## 🔗 Referencias y Recursos

- [NanoID GitHub](https://github.com/ai/nanoid)
- [MongoDB ObjectId Specification](https://docs.mongodb.com/manual/reference/method/ObjectId/)
- [Mongoose Lean Queries](https://mongoosejs.com/docs/tutorials/lean.html)
- [MongoDB Projection](https://docs.mongodb.com/manual/tutorial/project-fields-from-query-results/)

---

**Versión**: 1.0  
**Fecha**: Julio 2025  
**Autor**: Equipo de Desarrollo  
**Estado**: Aprobado para Producción
