import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe, UploadedFile } from '@nestjs/common';
import { VictimService } from './victim.service';
import { CreateVictimDto } from './dto/create-victim.dto';
import { UpdateDeathTypeDto } from './dto/update-death-type.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { UpdateDescription } from 'typeorm';
import { OnlyDetailsKeyPipe } from './pipes/onlydetailskeypipe';
import { UpdateDetailsDto } from './dto/update-death-details.dto';

@Controller('victim')
export class VictimController {
  constructor(private readonly victimService: VictimService) {}

  @Post()
  create(
    @Body() createVictimDto: CreateVictimDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.victimService.create(createVictimDto);
  }

  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.victimService.findAll(paginationDto);
  }

  @Get(':term')
  findOne(@Param('term') term: string) {
    return this.victimService.findOnePlain(term);
  }

  @Patch('deathtype/:id')
  updateDeathType(
    @Param('id',ParseUUIDPipe) id: string,
    @Body() updateDeathTypeDto: UpdateDeathTypeDto
  ) {
    return this.victimService.updateDeathType(id, updateDeathTypeDto);
  }

  @Patch('deathdetails/:id')
updateDeathDetails(
  @Param('id', ParseUUIDPipe) id: string,
  @Body(OnlyDetailsKeyPipe) updateDescription: UpdateDetailsDto
) {
  return this.victimService.updateDeathDetails(id, updateDescription);
}


  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.victimService.remove(id);
  }

  @Delete()
  deleteAllVictims(){
    return this.victimService.deleteAllVictims();
  }
}
