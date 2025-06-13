import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreateChargeDto } from './dto/create-charge.dto';

@Injectable()
export class PaymentService {
  //private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
    );
  }

  async createCharge({ card, amount }: CreateChargeDto) {
    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card,
    });
    return this.stripe.paymentIntents.create({
      payment_method: paymentMethod.id,
      amount: amount * 100, // Amount in cents (e.g., $10.00)
      confirm: true, // Automatically confirm the payment
      payment_method_types: ['card'],
      currency: 'usd',
    });
  }
}
