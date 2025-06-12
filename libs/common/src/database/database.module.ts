import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ModelDefinition, MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      //imports: [ConfigModule],
      /*useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      })*/
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        console.log('Connecting to MongoDB on DatabaseModule with URI:', uri);
        if (!uri) {
          throw new Error(
            'MONGODB_URI is not defined in the environment variables',
          );
        }
        return {
          uri,
          // Puedes agregar más opciones de conexión aquí si es necesario
          // como useNewUrlParser: true, useUnifiedTopology: true, etc.
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {
  static forFeature(models: ModelDefinition[]) {
    return MongooseModule.forFeature(models);
  }
}
