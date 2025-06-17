import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CurrentUser, MicroserviceJwtAuthGuard, UserDto } from '@app/common';

@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @UseGuards(MicroserviceJwtAuthGuard)
  create(
    @Body() createReservationDto: CreateReservationDto,
    @CurrentUser() user: UserDto,
  ) {
    return this.reservationService.create(createReservationDto, user);
  }

  @Get()
  @UseGuards(MicroserviceJwtAuthGuard)
  findAll() {
    return this.reservationService.findAll();
  }

  @Get(':id')
  @UseGuards(MicroserviceJwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.reservationService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(MicroserviceJwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    return this.reservationService.update(id, updateReservationDto);
  }

  @Delete(':id')
  @UseGuards(MicroserviceJwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.reservationService.remove(id);
  }
}
