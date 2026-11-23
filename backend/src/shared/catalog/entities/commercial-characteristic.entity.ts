import {Column,CreateDateColumn,Entity,Index,PrimaryGeneratedColumn,UpdateDateColumn} from 'typeorm';

export type CharacteristicKind='quality'|'origin';

@Entity({name:'commercial_characteristics'})
@Index('ix_commercial_characteristics_business_kind',['businessId','kind'])
export class CommercialCharacteristicEntity {
  @PrimaryGeneratedColumn('uuid') id!:string;
  @Column({name:'business_id',type:'uuid'}) businessId!:string;
  @Column({type:'varchar',length:16}) kind!:CharacteristicKind;
  @Column({type:'varchar',length:120}) name!:string;
  @Column({name:'is_active',type:'boolean',default:true}) isActive!:boolean;
  @CreateDateColumn({name:'created_at',type:'timestamptz'}) createdAt!:Date;
  @UpdateDateColumn({name:'updated_at',type:'timestamptz'}) updatedAt!:Date;
}
