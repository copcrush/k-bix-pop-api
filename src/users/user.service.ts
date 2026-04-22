import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import type { Prisma } from '../../generated/prisma/index.js';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from './entities/user.entity';
import { ManageUserDto } from './dto/manage-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import * as bcrypt from 'bcrypt';

const userPublicSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

const addressSelect = {
  id: true,
  userId: true,
  label: true,
  recipientName: true,
  line1: true,
  line2: true,
  city: true,
  stateRegion: true,
  postalCode: true,
  country: true,
  isDefault: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.user.findMany({
      select: userPublicSelect,
    });
    return rows.map((row) => plainToInstance(UserEntity, row));
  }

  async findSafeById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return plainToInstance(UserEntity, user);
  }

  /**
   * Updates name / phone and optionally changes password in one transaction.
   */
  async updateManageUser(userId: string, dto: ManageUserDto) {
    const wantsPassword =
      typeof dto.newPassword === 'string' && dto.newPassword.length > 0;

    if (wantsPassword) {
      if (!dto.currentPassword?.length) {
        throw new BadRequestException('Current password is required to change password');
      }
    }

    const profileData: Prisma.UserUpdateInput = {};

    if (dto.firstName !== undefined) {
      const t = dto.firstName.trim();
      profileData.firstName = t.length ? t : null;
    }
    if (dto.lastName !== undefined) {
      const t = dto.lastName.trim();
      profileData.lastName = t.length ? t : null;
    }
    if (dto.phone !== undefined) {
      const t = dto.phone.trim();
      profileData.phone = t.length ? t : null;
    }

    const hasProfileKeys = Object.keys(profileData).length > 0;

    if (!hasProfileKeys && !wantsPassword) {
      return this.findSafeById(userId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (wantsPassword) {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new UnauthorizedException();

        const ok = await bcrypt.compare(dto.currentPassword!, user.password);
        if (!ok) {
          throw new BadRequestException('Current password is incorrect');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(dto.newPassword!, salt);

        await tx.user.update({
          where: { id: userId },
          data: {
            ...profileData,
            password: hashedPassword,
            refreshToken: null,
          },
        });
      }
      else if (hasProfileKeys) {
        await tx.user.update({
          where: { id: userId },
          data: profileData,
        });
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: userPublicSelect,
      });
      if (!user) throw new NotFoundException('User not found');
      return plainToInstance(UserEntity, user);
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      throw new BadRequestException('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, refreshToken: null },
    });

    return { message: 'Password updated successfully' };
  }

  async listAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      select: addressSelect,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const count = await this.prisma.address.count({ where: { userId } });
    const shouldDefault = dto.isDefault === true || count === 0;

    return this.prisma.$transaction(async (tx) => {
      if (shouldDefault) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          label: dto.label?.trim() || null,
          recipientName: dto.recipientName.trim(),
          line1: dto.line1.trim(),
          line2: dto.line2?.trim() || null,
          city: dto.city.trim(),
          stateRegion: dto.stateRegion?.trim() || null,
          postalCode: dto.postalCode.trim(),
          country: dto.country.trim().toUpperCase(),
          isDefault: shouldDefault,
        },
        select: addressSelect,
      });
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!existing) throw new NotFoundException('Address not found');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true) {
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      const patch: Prisma.AddressUpdateInput = {};
      if (dto.label !== undefined) {
        patch.label =
          dto.label === null ? null : dto.label.trim() || null;
      }
      if (dto.recipientName !== undefined) {
        patch.recipientName = dto.recipientName.trim();
      }
      if (dto.line1 !== undefined) patch.line1 = dto.line1.trim();
      if (dto.line2 !== undefined) {
        patch.line2 =
          dto.line2 === null ? null : dto.line2.trim() || null;
      }
      if (dto.city !== undefined) patch.city = dto.city.trim();
      if (dto.stateRegion !== undefined) {
        patch.stateRegion =
          dto.stateRegion === null ? null : dto.stateRegion.trim() || null;
      }
      if (dto.postalCode !== undefined) patch.postalCode = dto.postalCode.trim();
      if (dto.country !== undefined) {
        patch.country = dto.country.trim().toUpperCase();
      }
      if (dto.isDefault === true) patch.isDefault = true;
      if (dto.isDefault === false) patch.isDefault = false;

      if (Object.keys(patch).length > 0) {
        await tx.address.update({
          where: { id: addressId },
          data: patch,
        });
      }

      if (dto.isDefault === false && existing.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId, id: { not: addressId } },
          orderBy: { updatedAt: 'desc' },
        });
        if (next) {
          await tx.address.updateMany({
            where: { userId },
            data: { isDefault: false },
          });
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }

      return tx.address.findUniqueOrThrow({
        where: { id: addressId },
        select: addressSelect,
      });
    });
  }

  async deleteAddress(userId: string, addressId: string) {
    const row = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!row) throw new NotFoundException('Address not found');

    await this.prisma.$transaction(async (tx) => {
      const wasDefault = row.isDefault;
      await tx.address.delete({ where: { id: addressId } });
      if (wasDefault) {
        const next = await tx.address.findFirst({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
        });
        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { message: 'Address deleted' };
  }
}
