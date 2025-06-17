import { Controller, UsePipes, ValidationPipe } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentCreateChargeDto } from './dto/payment-create-charge.dto';

@Controller()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @MessagePattern('create_charge')
  @UsePipes(new ValidationPipe())
  createCharge(@Payload() params: PaymentCreateChargeDto) {
    return this.paymentService.createCharge(params);
  }
}
