import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { NOTIFICATION_SERVICE, CreateChargeDto } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentService {
  //private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    @Inject(NOTIFICATION_SERVICE)
    private readonly notificationService: ClientProxy,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY')!,
    );
  }

  async createCharge({
    /*card,*/ amount,
  }: CreateChargeDto): Promise<Stripe.Response<Stripe.PaymentIntent>> {
    const paymentIntent = await this.stripe.paymentIntents.create({
      //payment_method: paymentMethod.id,
      //payment_method_types: ['card'],
      amount: amount * 100, // Amount in cents (e.g., $10.00)
      confirm: true, // Automatically confirm the payment
      currency: 'usd',
      payment_method: 'pm_card_visa', // Replace with the actual payment method ID

      // Deshabilitar rediccionamientos automáticos
      // o usar return_url: 'https://tu-dominio.com/payment/return',
      automatic_payment_methods: {
        allow_redirects: 'never',
        enabled: true,
      },
    });

    this.notificationService.emit('notify_email', {});
    return paymentIntent;

    /*const formattedCard: Stripe.PaymentMethodCreateParams.Card = {
      number: card.number,
      exp_month: card.expMonth,
      exp_year: card.expYear,
      cvc: card.cvc,
    };
    
    const paymentMethod = await this.stripe.paymentMethods.create({
      type: 'card',
      card: formattedCard,
    });*/
  }
}
