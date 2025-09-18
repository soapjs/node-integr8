import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User | null> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  @Post()
  async create(@Body() userData: Partial<User>): Promise<User> {
    if (!userData.name || !userData.email) {
      throw new Error('Name and email are required');
    }
    return this.usersService.create(userData);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() userData: Partial<User>
  ): Promise<User | null> {
    const user = await this.usersService.update(id, userData);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new Error('User not found');
    }
    await this.usersService.remove(id);
  }
}
