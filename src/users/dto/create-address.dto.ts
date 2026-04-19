import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsString()
  @MaxLength(160)
  recipientName: string;

  @IsString()
  @MaxLength(200)
  line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @MaxLength(120)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  stateRegion?: string;

  @IsString()
  @MaxLength(32)
  postalCode: string;

  @IsString()
  @MaxLength(4)
  country: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
