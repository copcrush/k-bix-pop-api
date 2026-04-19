import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/auth/strategies/jwt-auth.guard';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { ManageUserDto } from './dto/manage-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @Get('me/addresses')
  @UseGuards(JwtAuthGuard)
  async listMyAddresses(@GetUser() user: { userId: string }) {
    return this.userService.listAddresses(user.userId);
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async createMyAddress(
    @GetUser() user: { userId: string },
    @Body() dto: CreateAddressDto,
  ) {
    return this.userService.createAddress(user.userId, dto);
  }

  @Patch('me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  async updateMyAddress(
    @GetUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.userService.updateAddress(user.userId, id, dto);
  }

  @Delete('me/addresses/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async deleteMyAddress(
    @GetUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.userService.deleteAddress(user.userId, id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@GetUser() user: { userId: string }) {
    return this.userService.findSafeById(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @GetUser() user: { userId: string },
    @Body() dto: ManageUserDto,
  ) {
    return this.userService.updateManageUser(user.userId, dto);
  }

  @Post('me/password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @GetUser() user: { userId: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(
      user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
