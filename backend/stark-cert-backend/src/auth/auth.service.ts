import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  // This services are placeholders for actual user validation logic.
  async validateUser(username: string, password: string): Promise<any> {
    return { id: 1, username };
  }

  //Proper typing for the payload should be applied when validating JWT
  async validateJwtPayload(payload: any): Promise<any> {
    return { userId: payload.sub, username: payload.username };
  }
}
