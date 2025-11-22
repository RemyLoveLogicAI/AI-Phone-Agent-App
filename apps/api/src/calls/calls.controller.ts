import { Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { CallsService } from './calls.service';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('incoming')
  handleIncomingCall(@Res() res: Response) {
    const twiml = this.callsService.handleIncomingCall();
    res.type('text/xml');
    res.send(twiml);
  }
}
