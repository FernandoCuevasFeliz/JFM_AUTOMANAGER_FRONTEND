import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { FormField, FormRow, FormSection, fieldAria } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { handleFormError } from '@/lib/errors';
import { MANUALLY_ASSIGNABLE_VEHICLE_STATUSES, VEHICLE_STATUS_META } from '@/lib/status';
import { diffPayload, isEmptyPayload } from '@/lib/zod-helpers';
import { useBrands, useCreateVehicle, useModels, useUpdateVehicle } from '../hooks';
import {
  VEHICLE_FORM_FIELDS,
  type CreateVehicleFormValues,
  type VehicleFormValues,
  createVehicleSchema,
  vehicleFormSchema,
} from '../schemas';
import type { Vehicle } from '../types';

/** Valores libres frecuentes; el backend los acepta como texto de 20 caracteres. */
const TRANSMISSION_OPTIONS = ['automatica', 'manual', 'cvt'];
const FUEL_OPTIONS = ['gasolina', 'diesel', 'hibrido', 'electrico', 'gas'];

interface VehicleFormProps {
  /** Si viene, el formulario edita; si no, crea. */
  vehicle?: Vehicle;
}

/**
 * Alta y edicion de vehiculos.
 *
 * Al editar no se muestra el estado: `PATCH /vehicles/:id` no lo acepta y el
 * cambio se hace desde el dialogo de estado, sujeto a la maquina de estados.
 */
export function VehicleForm({ vehicle }: VehicleFormProps) {
  const navigate = useNavigate();
  const isEdit = Boolean(vehicle);

  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle(vehicle?.id ?? '');

  const defaultValues = React.useMemo<CreateVehicleFormValues>(
    () => ({
      brandId: vehicle?.brandId ?? '',
      modelId: vehicle?.modelId ?? '',
      year: vehicle?.year ?? new Date().getFullYear(),
      chassisNumber: vehicle?.chassisNumber ?? '',
      color: vehicle?.color ?? null,
      mileage: vehicle?.mileage ?? null,
      engineNumber: vehicle?.engineNumber ?? null,
      transmissionType: vehicle?.transmissionType ?? null,
      fuelType: vehicle?.fuelType ?? null,
      salePrice: vehicle?.salePrice ?? null,
      status: 'in_transit',
      notes: vehicle?.notes ?? null,
      isActive: vehicle?.isActive ?? true,
    }),
    [vehicle],
  );

  const form = useForm<CreateVehicleFormValues>({
    resolver: zodResolver(isEdit ? (vehicleFormSchema as never) : createVehicleSchema),
    defaultValues,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const brandId = watch('brandId');

  const brandsQuery = useBrands();
  // Select en cascada: los modelos se piden por marca (§5.2 de API.md).
  const modelsQuery = useModels(brandId ? { brandId } : {});

  const brands = brandsQuery.data ?? [];
  const models = brandId ? (modelsQuery.data ?? []) : [];

  // Cambiar de marca invalida el modelo elegido.
  const previousBrandRef = React.useRef(brandId);
  React.useEffect(() => {
    if (previousBrandRef.current && previousBrandRef.current !== brandId) {
      setValue('modelId', '', { shouldValidate: false });
    }
    previousBrandRef.current = brandId;
  }, [brandId, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && vehicle) {
        // Un PATCH manda solo lo que cambio; el cuerpo vacio da 400.
        const { status: _status, ...editable } = values;
        const original: Partial<VehicleFormValues> = {
          brandId: vehicle.brandId,
          modelId: vehicle.modelId,
          year: vehicle.year,
          chassisNumber: vehicle.chassisNumber,
          color: vehicle.color,
          mileage: vehicle.mileage,
          engineNumber: vehicle.engineNumber,
          transmissionType: vehicle.transmissionType,
          fuelType: vehicle.fuelType,
          salePrice: vehicle.salePrice,
          notes: vehicle.notes,
          isActive: vehicle.isActive,
        };

        const payload = diffPayload(original, editable as VehicleFormValues);

        if (isEmptyPayload(payload)) {
          navigate(`/vehicles/${vehicle.id}`);
          return;
        }

        await updateVehicle.mutateAsync(payload);
        navigate(`/vehicles/${vehicle.id}`);
        return;
      }

      const created = await createVehicle.mutateAsync(values);
      navigate(`/vehicles/${created.id}`);
    } catch (error) {
      handleFormError(error, setError, { knownFields: VEHICLE_FORM_FIELDS });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      <Card>
        <CardContent className="flex flex-col gap-6 pt-6">
          <FormSection title="Identificacion" description="Marca, modelo y numero de chasis de la unidad.">
            <FormRow columns={3}>
              <FormField label="Marca" htmlFor="brandId" error={errors.brandId} required>
                <Controller
                  control={control}
                  name="brandId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={brandsQuery.isLoading}>
                      <SelectTrigger id="brandId" aria-invalid={errors.brandId ? true : undefined}>
                        <SelectValue placeholder={brandsQuery.isLoading ? 'Cargando…' : 'Selecciona una marca'} />
                      </SelectTrigger>
                      <SelectContent>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label="Modelo"
                htmlFor="modelId"
                error={errors.modelId}
                required
                hint={!brandId ? 'Selecciona primero una marca' : undefined}
              >
                <Controller
                  control={control}
                  name="modelId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!brandId || modelsQuery.isLoading}
                    >
                      <SelectTrigger id="modelId" aria-invalid={errors.modelId ? true : undefined}>
                        <SelectValue placeholder={modelsQuery.isLoading ? 'Cargando…' : 'Selecciona un modelo'} />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Ano" htmlFor="year" error={errors.year} required>
                <Input
                  {...fieldAria('year', errors.year)}
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  max={2100}
                  placeholder="2024"
                  {...register('year')}
                />
              </FormField>
            </FormRow>

            <FormRow columns={3}>
              <FormField
                label="Numero de chasis (VIN)"
                htmlFor="chassisNumber"
                error={errors.chassisNumber}
                required
                hint="Se guarda en mayusculas y debe ser unico."
              >
                <Input
                  {...fieldAria('chassisNumber', errors.chassisNumber)}
                  placeholder="JT2BF22K1X0111111"
                  className="uppercase"
                  autoCapitalize="characters"
                  spellCheck={false}
                  {...register('chassisNumber')}
                />
              </FormField>

              <FormField label="Numero de motor" htmlFor="engineNumber" error={errors.engineNumber}>
                <Input {...fieldAria('engineNumber', errors.engineNumber)} {...register('engineNumber')} />
              </FormField>

              <FormField label="Color" htmlFor="color" error={errors.color}>
                <Input {...fieldAria('color', errors.color)} placeholder="Blanco" {...register('color')} />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Caracteristicas">
            <FormRow columns={3}>
              <FormField label="Kilometraje" htmlFor="mileage" error={errors.mileage}>
                <Input
                  {...fieldAria('mileage', errors.mileage)}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="0"
                  {...register('mileage')}
                />
              </FormField>

              <FormField label="Transmision" htmlFor="transmissionType" error={errors.transmissionType}>
                <Controller
                  control={control}
                  name="transmissionType"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="transmissionType">
                        <SelectValue placeholder="Sin especificar" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSMISSION_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option} className="capitalize">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="Combustible" htmlFor="fuelType" error={errors.fuelType}>
                <Controller
                  control={control}
                  name="fuelType"
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger id="fuelType">
                        <SelectValue placeholder="Sin especificar" />
                      </SelectTrigger>
                      <SelectContent>
                        {FUEL_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option} className="capitalize">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection
            title="Comercial"
            description="El precio de lista es una referencia: el precio real se fija al vender."
          >
            <FormRow columns={isEdit ? 2 : 3}>
              <FormField label="Precio de lista (RD$)" htmlFor="salePrice" error={errors.salePrice}>
                <Input
                  {...fieldAria('salePrice', errors.salePrice)}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder="1850000.00"
                  {...register('salePrice')}
                />
              </FormField>

              {/* Al editar, el estado se cambia desde su propio dialogo. */}
              {!isEdit && (
                <FormField
                  label="Estado inicial"
                  htmlFor="status"
                  error={errors.status}
                  required
                  hint="Reservado y vendido los asigna el ciclo comercial."
                >
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MANUALLY_ASSIGNABLE_VEHICLE_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {VEHICLE_STATUS_META[status].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              )}

              <FormField label="Activo" htmlFor="isActive" error={errors.isActive}>
                <div className="flex h-9 items-center gap-2.5">
                  <Controller
                    control={control}
                    name="isActive"
                    render={({ field }) => (
                      <Switch id="isActive" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                  <span className="text-sm text-muted-foreground">
                    {watch('isActive') ? 'Visible en los listados' : 'Oculto en los listados'}
                  </span>
                </div>
              </FormField>
            </FormRow>

            <FormField label="Notas" htmlFor="notes" error={errors.notes}>
              <Textarea
                {...fieldAria('notes', errors.notes)}
                rows={3}
                placeholder="Observaciones internas sobre la unidad…"
                {...register('notes')}
              />
            </FormField>
          </FormSection>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(vehicle ? `/vehicles/${vehicle.id}` : '/vehicles')}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Guardar cambios' : 'Registrar vehiculo'}
        </Button>
      </div>
    </form>
  );
}
