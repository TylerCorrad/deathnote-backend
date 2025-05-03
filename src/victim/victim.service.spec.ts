import { Test, TestingModule } from '@nestjs/testing';
import { VictimService } from './victim.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Victim } from './entities/victim.entity';
import { VictimImage } from './entities/victim-image.entity';
import { Repository, UpdateDescription } from 'typeorm';
import { CreateVictimDto } from './dto/create-victim.dto';
import { UpdateDeathTypeDto } from './dto/update-death-type.dto';
import { UpdateDetailsDto } from './dto/update-death-details.dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';


const victimArray = [
  {
    id: 'uuid-1',
    name: 'JOHN',
    lastName: 'DOE',
    isAlive: true,
    createdAt: new Date(),
    EditedAt: null,
    deathType: 'paro cardiaco',
    images: [],
  },
];


describe('VictimService', () => {
  let service: VictimService;
  let victimRepository: Repository<Victim>;
  let victimImageRepository: Repository<VictimImage>;

  const victimMock = {
    id: 'uuid-1',
    name: 'John',
    lastName: 'Doe',
    deathType: 'asesinato',
    details: null,
    isAlive: true,
    createdAt: new Date(),
    EditedAt: null,
    images: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VictimService,
        {
          provide: getRepositoryToken(Victim),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOneBy: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              getOne: jest.fn(),
              delete: jest.fn().mockReturnThis(),
              execute: jest.fn(),
            })),
            preload: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VictimImage),
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();
  
    service = module.get<VictimService>(VictimService);
    victimRepository = module.get<Repository<Victim>>(getRepositoryToken(Victim));
    victimImageRepository = module.get<Repository<VictimImage>>(getRepositoryToken(VictimImage));
  });
  
  it('deberia estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('deberia crear una nueva victima', async () => {
      const dto: CreateVictimDto = {
        name: 'John',
        lastName: 'Doe',
        images: ['/static/products/00db3e43-abb2-42b8-a80d-12cdc6b1a3ea.jpeg'],
      };
  
      
      const created = { 
        ...dto, 
        id: 'uuid', 
        images: [{ 
          url: dto.images[0], 
          victim: {
            id: 'uuid',
            name: 'John',
            lastName: 'Doe',
            deathType: 'paro cardiaco',  
            details: null,  
            isAlive: false, 
            createdAt: new Date(),
            EditedAt: null,
            images: [],  
            checkFullNameInsert: jest.fn()
          }
        }]
      };
  
      
      jest.spyOn(victimImageRepository, 'create').mockReturnValue({
        url: dto.images[0],
        victim: {
          id: 'uuid',
          name: 'John',
          lastName: 'Doe',
          deathType: 'paro cardiaco',
          details: null,
          isAlive: true,
          createdAt: new Date(),
          EditedAt: null,
          images: [], 
          checkFullNameInsert: jest.fn()
        },
        id: 0
      });
  
      // Simulando la creación y guardado de la víctima
      jest.spyOn(victimRepository, 'create').mockReturnValue(created as any);
      jest.spyOn(victimRepository, 'save').mockResolvedValue(created as any);
  
      // Ejecutar el método
      const result = await service.create(dto);
  
      // Aseguramos que el resultado sea el esperado
      expect(result).toEqual({ 
        ...created, 
        images: dto.images  
      });
    });
  });
    
  
  describe('findAll', () => {
    it('deberia devolver todaas las victimas y sus imagenes', async () => {
      const fakeVictims = [{ ...victimArray[0], images: [{ url: 'img1.jpg' }] }];
      jest.spyOn(victimRepository, 'find').mockResolvedValue(fakeVictims as any);

      const result = await service.findAll({ limit: 10, offset: 0 });
      expect(result[0].images).toEqual(['img1.jpg']);
    });
  });

  describe('findOnePlain', () => {
    it('deberia devolver una victima', async () => {
      const victim = { ...victimArray[0], images: [{ url: 'img.jpg' }] };
      jest.spyOn(service, 'findOne').mockResolvedValue(victim as any);

      const result = await service.findOnePlain('uuid-1');
      expect(result.images).toEqual(['img.jpg']);
    });
  });

  describe('updateDeathType', () => {
    it('deberia actualizar el deathType y devolver la victima', async () => {
      const updateDto: UpdateDeathTypeDto = { deathType: 'suicidio' };
      const updated = { ...victimArray[0], ...updateDto };

      jest.spyOn(victimRepository, 'preload').mockResolvedValue(updated as any);
      jest.spyOn(victimRepository, 'save').mockResolvedValue(updated as any);
      jest.spyOn(service, 'findOnePlain').mockResolvedValue(updated as any);

      const result = await service.updateDeathType('uuid-1', updateDto);
      expect(result.deathType).toBe('suicidio');
    });

    it('deberia lanzar NotFound si la victima no existe', async () => {
      jest.spyOn(victimRepository, 'preload').mockResolvedValue(null);
      await expect(service.updateDeathType('bad-id', { deathType: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDeathDetails', () => {
    it('deberia cambiar los detalles y devolver a la victima con los detalles nuevos', async () => {
      const updateDetailsMock: UpdateDetailsDto = {
        details: 'Cambiada',
      };
    
      jest.spyOn(victimRepository, 'preload').mockResolvedValue({
        ...victimMock,
        ...updateDetailsMock,
        checkFullNameInsert: () => {},
      });
    
      jest.spyOn(victimRepository, 'save').mockResolvedValue({
        ...victimMock,
        ...updateDetailsMock,
        checkFullNameInsert: () => {},
      });
    
      jest.spyOn(service, 'findOnePlain').mockResolvedValue({
        ...victimMock,
        ...updateDetailsMock,
      });
    
      const result = await service.updateDeathDetails(victimMock.id, updateDetailsMock);
    
      expect(result).toEqual(expect.objectContaining(updateDetailsMock));
    });
    

    it('deberia lanzar NotFoundException si no se encuentra la victima', async () => {
      // Simulamos que 'preload' no encuentra la víctima
      const updateDetailsMock: UpdateDetailsDto =  {details: "detalles nuevos"};
      jest.spyOn(victimRepository, 'preload').mockResolvedValue(null);

      // Verificamos que se lanza la excepción esperada
      await expect(
        service.updateDeathDetails(victimMock.id, updateDetailsMock),
      ).rejects.toThrow(NotFoundException);
    });

    it('deberia lanzar InternalServerErrorException si falla al guardar', async () => {
      const updateDetailsMock: UpdateDetailsDto =  {details: "detalles nuevos"};
      // Simulamos que 'preload' devuelve la víctima
      jest.spyOn(victimRepository, 'preload').mockResolvedValue(victimMock as any);
      // Simulamos que 'save' falla
      jest.spyOn(victimRepository, 'save').mockRejectedValue(new Error('Database error'));

      // Verificamos que se lanza la excepción esperada
      await expect(
        service.updateDeathDetails(victimMock.id, updateDetailsMock),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    it('should remove a victim', async () => {
      const victim = victimArray[0];
      jest.spyOn(service, 'findOne').mockResolvedValue(victim as any);
      jest.spyOn(victimRepository, 'remove').mockResolvedValue(victim as any);

      await expect(service.remove('uuid-1')).resolves.toBeUndefined();
    });
  });

  describe('deleteAllVictims', () => {
    it('should delete all victims', async () => {
      const deleteMock = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      jest.spyOn(victimRepository, 'createQueryBuilder').mockReturnValue(deleteMock as any);

      const result = await service.deleteAllVictims();
      expect(result).toEqual({ affected: 5 });
    });
  });
});
