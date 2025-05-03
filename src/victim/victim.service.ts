import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateVictimDto } from './dto/create-victim.dto';
import { UpdateDeathTypeDto } from './dto/update-death-type.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Victim } from './entities/victim.entity';
import { Repository, UpdateDescription } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { VictimImage } from './entities/victim-image.entity';
import { isUUID } from 'class-validator';
import { Cron } from '@nestjs/schedule';
import { UpdateDetailsDto } from './dto/update-death-details.dto';

@Injectable()
export class VictimService {
  private readonly logger = new Logger('VictimService')
  constructor(
    @InjectRepository(Victim)
    private readonly victimRepository: Repository<Victim>,

    @InjectRepository(VictimImage)
    private readonly victimImageRepository: Repository<VictimImage>,

  ){}
  
  async create(createVictimDto: CreateVictimDto) {
    try {
      const{images= [], ...victimDetails} = createVictimDto
      const victim = this.victimRepository.create({
        ...victimDetails,
        images: images.map(image => this.victimImageRepository.create({url:image})),
      });
      await this.victimRepository.save(victim);
      return {...victim, images};


    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  @Cron('*/10 * * * * *', { name: 'miCronJobCada10Segundos' })
  async findAllCron(){
    const pagination = {
      limit: 100,
      offset: 0
    }
    var list =await this.findAll(pagination)
    let listLenght = await list.length
    const currentTime = new Date();
    // const adjustedTime = new Date(currentTime.getTime() + 5 * 60 * 60 * 1000);

    for (let i = 0; i < listLenght; i++) {
      var victim =list[i]
      if (!victim.isAlive) continue;
      
      if (victim.images.length == 0) continue;

      if (victim.EditedAt){
        var difference = currentTime.getTime()-victim.EditedAt.getTime();
      } else{
        var difference = currentTime.getTime()-victim.createdAt.getTime();
      }

      let id = victim.id;

      if (victim.deathType == 'Heart Attack' && difference >= 40*1000){
          const victimrepo = await this.victimRepository.preload({
            id: id,
            isAlive : false
          });
          await this.victimRepository.save(victimrepo);
      }
      

      if (victim.isAlive && victim.deathType != 'Heart Attack'){
        if(victim.details && difference >= 40*1000){
          const victimrepo = await this.victimRepository.preload({
            id: id,
            isAlive : false
          });
          await this.victimRepository.save(victimrepo);
          console.log(victim)
        }
        if (difference >= 400*1000){
          const victimrepo = await this.victimRepository.preload({
            id: id,
            isAlive : false
          });
          await this.victimRepository.save(victimrepo);
        }
        
      }
    }
    
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 20, offset = 0 } = paginationDto;
    const products = await this.victimRepository.find({
      take:limit,
      skip: offset,
      relations: {
        images:true,
      }
    })
    // console.log(products.map(product=>({...product,images: product.images.map(img=> img.url)})))
    return products.map(product=>({
      ...product,
      images: product.images.map(img=> img.url)
    }))
  }

  async findOne(term: string) {

    let victim: Victim;

    if(isUUID(term)){
      victim = await this.victimRepository.findOneBy({id:term})
    } else{
      const queryBuilder = this.victimRepository.createQueryBuilder('prod');
      victim = await queryBuilder
      .where(`title ILIKE :term OR slug =:term`, {
        lastName:term.toUpperCase(),
        name:term.toUpperCase(),
      })
      .leftJoinAndSelect('prod.images','prodImages')
      .getOne();
    }

        if (!victim) 
          throw new NotFoundException(`Victim with ${term} not found`)
        return victim;
  }

  async findOnePlain( term: string){
    const {images = [], ...rest } = await this.findOne(term);
    return{
      ...rest,
      images: images.map(image => image.url)
    }
  }

  async updateDeathType(id: string, updateDeathTypeDto: UpdateDeathTypeDto) {

    const currentTimestamp: Date = new Date();
    const offset = 5; // Diferencia de +5 horas entre el sistema y PostgreSQL
    currentTimestamp.setHours(currentTimestamp.getHours() + offset);

    const victim = await this.victimRepository.preload({
      id: id,
      EditedAt: currentTimestamp,
      ...updateDeathTypeDto,
    });

    if(!victim) throw new NotFoundException(`Victim with id ${id} not found`);
    try {
      await this.victimRepository.save(victim);
      return this.findOnePlain(id);
    } catch (error) {
      throw new InternalServerErrorException('Error al editar DeathType')
    }
  }

  async updateDeathDetails(id: string, UpdateDetailsDto: UpdateDetailsDto) {

    const currentTimestamp: Date = new Date();
    const offset = 5; // Diferencia de +5 horas entre el sistema y PostgreSQL
    currentTimestamp.setHours(currentTimestamp.getHours() + offset);

    const victim = await this.victimRepository.preload({
      id: id,
      EditedAt: currentTimestamp,
      ...this.updateDeathDetails
    });

    if(!victim) throw new NotFoundException(`Victim with id ${id} not found`);
    try {
      await this.victimRepository.save(victim);
      return this.findOnePlain(id);
    } catch (error) {
      throw new InternalServerErrorException('Error al editar DeathDetails')
    }
  }

  async remove(id: string) { //! EL REMOVE SE PUEDE HACER TAMBIEN CON TRANSACCIONES, REVISAR EL CAPITULO 149.Transacciones cualquier duda
    const victim = await this.findOne(id);
    await this.victimRepository.remove(victim);
  }


  private handleDBExceptions(error:any){
    if(error.code === '23505')
      throw new BadRequestException(error.detail);
    
    this.logger.error(error)
    //console.log(error)
    throw new InternalServerErrorException('Unexpected error, check server logs')
  }
  
  async deleteAllVictims(){
    const query= this.victimRepository.createQueryBuilder('victim');

    try {
      return await query
      .delete()
      .where({})
      .execute();
      
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }
}
