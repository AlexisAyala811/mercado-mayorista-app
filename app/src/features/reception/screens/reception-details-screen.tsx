import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppButton, AppScreen, FeedbackState, FormField, FormSection, ScreenHeader, SelectionField, StepProgress } from '@/ui/components';
import { spacing } from '@/ui/tokens';
import type {ReactNode} from 'react';
import { BottomNavSlots } from '@/ui/navigation/app-chrome';

export type ReceptionDetails = {
  date: string;
  driverName: string;
  expectedVarieties: string;
  providerName: string;
  providerPhone: string;
  vehiclePlate: string;
};

type ReceptionDetailsScreenProps = {
  referenceActions?:ReactNode;
  referenceFeedback?:ReactNode;
  errorMessage?: string;
  notice?:string;
  recoveryNotice?: string;
  isSubmitting?: boolean;
  isInteractionBlocked?: boolean;
  onBack?: () => void;
  onChange: (field: keyof ReceptionDetails, value: string) => void;
  onContinue?: () => void;
  onSelectProvider?: () => void;
  onSelectVarieties?: () => void;
  onSelectVehicle?: () => void;
  values: ReceptionDetails;
};

const steps = ['Datos', 'Pesaje', 'Liquidación', 'Confirmación'] as const;

export function ReceptionDetailsScreen({
  referenceActions,
  referenceFeedback,
  errorMessage,
  notice,
  recoveryNotice,
  isSubmitting,
  isInteractionBlocked,
  onBack,
  onChange,
  onContinue,
  onSelectProvider,
  onSelectVarieties,
  onSelectVehicle,
  values,
}: ReceptionDetailsScreenProps) {
  const { width } = useWindowDimensions();
  const useColumns = width >= 760;
  const locked = Boolean(isSubmitting || isInteractionBlocked);

  return (
    <AppScreen contentContainerStyle={styles.screen} testID="reception-details-screen">
      <ScreenHeader
        description="Registra la información de llegada antes de iniciar la captura consecutiva de sacos."
        eyebrow="RECEPCIÓN Y COMPRA"
        title="Nueva recepción"
      />

      <StepProgress activeIndex={0} steps={steps} />
      {referenceActions}
      {referenceFeedback}
      {recoveryNotice ? <FeedbackState title="Edición de compra recuperada" message={recoveryNotice} /> : null}
      {notice?<FeedbackState title="Datos de referencia" message={notice}/>:null}
      {errorMessage ? <FeedbackState message={errorMessage} title="No se pudo iniciar la recepción" tone="error" /> : null}

      <FormSection
        description="Los datos se conservarán con la recepción y acompañarán el pesaje y la liquidación."
        footer={
          <View style={styles.actions}>
            <BottomNavSlots back={onBack ? { label: "Atrás", disabled: locked, onPress: onBack } : null} />
            <AppButton disabled={!onContinue || locked} label={isSubmitting ? 'Guardando…' : 'Continuar al pesaje'} onPress={onContinue} />
          </View>
        }
        style={styles.form}
        title="Datos de recepción">
        <View style={[styles.fields, useColumns && styles.fieldsColumns]}>
          <View style={[styles.fieldSlot, useColumns && styles.fieldColumn]}>
            <FormField
              label="Fecha"
              editable={!locked}
              onChangeText={(value) => onChange('date', value)}
              placeholder="aaaa-mm-dd"
              value={values.date}
            />
          </View>
          <View style={[styles.fieldSlot, useColumns && styles.fieldColumn]}>
            <SelectionField
              label="Proveedor"
              disabled={locked}
              onPress={onSelectProvider}
              placeholder="Selecciona un proveedor"
              value={values.providerName}
            />
          </View>
          <View style={[styles.fieldSlot, useColumns && styles.fieldColumn]}>
            <FormField
              keyboardType="phone-pad"
              label="Teléfono del proveedor"
              editable={!locked}
              onChangeText={(value) => onChange('providerPhone', value)}
              placeholder="Opcional"
              value={values.providerPhone}
            />
          </View>
          <View style={[styles.fieldSlot, useColumns && styles.fieldColumn]}>
            <SelectionField
              label="Vehículo"
              disabled={locked}
              onPress={onSelectVehicle}
              placeholder="Selecciona un vehículo"
              value={values.vehiclePlate}
            />
          </View>
          <View style={[styles.fieldSlot, useColumns && styles.fieldColumn]}>
            <FormField
              autoCapitalize="words"
              label="Conductor"
              editable={!locked}
              onChangeText={(value) => onChange('driverName', value)}
              placeholder="Nombre del conductor"
              value={values.driverName}
            />
          </View>
          <View style={[styles.fieldSlot, useColumns && styles.fieldColumn]}>
            <SelectionField
              label="Variedades esperadas"
              disabled={locked}
              onPress={onSelectVarieties}
              placeholder="Selecciona una o más variedades"
              supportingText="Podrás asociar cada saco con una variedad durante el pesaje."
              value={values.expectedVarieties}
            />
          </View>
        </View>
      </FormSection>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  form: { maxWidth: 920 },
  fields: { gap: spacing.md },
  fieldsColumns: { flexDirection: 'row', flexWrap: 'wrap' },
  fieldSlot: { flexGrow: 1 },
  fieldColumn: { flexBasis: 360 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
});
