import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, RotateCcw, Tags, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { FormField, fieldAria } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/states';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/use-auth';
import {
  useBrands,
  useCreateBrand,
  useCreateModel,
  useModels,
  useUpdateBrand,
  useUpdateModel,
} from '@/features/vehicles/hooks';
import {
  brandFormSchema,
  modelFormSchema,
  type BrandFormValues,
  type ModelFormValues,
} from '@/features/vehicles/schemas';
import type { VehicleBrand, VehicleModel } from '@/features/vehicles/types';
import { handleFormError } from '@/lib/errors';
import { EXPENSE_SCOPE_META } from '@/lib/status';
import { z } from 'zod';
import { requiredText } from '@/lib/zod-helpers';
import { useCreateExpenseCategory, useExpenseCategories } from '../hooks';

/**
 * Mantenimiento de catalogos: marcas, modelos y categorias de gasto.
 *
 * "Eliminar" aqui significa **desactivar**, y no es un eufemismo: la API no
 * expone `DELETE` para marcas ni modelos (§5.2 de API.md) porque siempre hay
 * vehiculos historicos apuntando a ellos. Borrarlos de verdad dejaria fichas de
 * vehiculos vendidos sin marca. Al desactivarlos desaparecen de los selectores
 * de alta y se quedan visibles en lo ya registrado, que es lo que se busca.
 */
export function CatalogsPage() {
  const { can } = useAuth();
  const canWrite = can('catalogs:write');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Catalogos"
        description="Listas maestras que alimentan los formularios del sistema."
      />

      <Tabs defaultValue="brands">
        <TabsList>
          <TabsTrigger value="brands">Marcas</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="expense-categories">Categorias de gasto</TabsTrigger>
        </TabsList>

        <TabsContent value="brands">
          <BrandsPanel canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="models">
          <ModelsPanel canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="expense-categories">
          <ExpenseCategoriesPanel canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Marcas ------------------------------------------------------------------

function BrandsPanel({ canWrite }: { canWrite: boolean }) {
  const brandsQuery = useBrands({ includeInactive: true });
  const updateBrand = useUpdateBrand();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<VehicleBrand | undefined>();
  const [toDeactivate, setToDeactivate] = React.useState<VehicleBrand | null>(null);

  const brands = brandsQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle>Marcas</CardTitle>
          <CardDescription>
            Al eliminarlas dejan de ofrecerse en altas nuevas; los vehiculos que ya las usan las
            conservan.
          </CardDescription>
        </div>
        {canWrite && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus />
            Nueva marca
          </Button>
        )}
      </CardHeader>

      <CardContent className="px-0">
        {brandsQuery.isLoading ? (
          <TableSkeleton rows={5} columns={3} />
        ) : brandsQuery.isError ? (
          <ErrorState error={brandsQuery.error} onRetry={() => void brandsQuery.refetch()} />
        ) : brands.length === 0 ? (
          <EmptyState icon={Tags} title="Sin marcas" description="Agrega la primera marca." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Marca</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell>
                    {brand.isActive ? (
                      <Badge variant="green">Activa</Badge>
                    ) : (
                      <Badge variant="neutral">Inactiva</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite && (
                      <span className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditing(brand);
                            setDialogOpen(true);
                          }}
                          aria-label={`Editar ${brand.name}`}
                        >
                          <Pencil />
                        </Button>

                        {brand.isActive ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setToDeactivate(brand)}
                            aria-label={`Eliminar ${brand.name}`}
                          >
                            <Trash2 />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              updateBrand.mutate({ id: brand.id, name: brand.name, isActive: true })
                            }
                            aria-label={`Reactivar ${brand.name}`}
                          >
                            <RotateCcw />
                          </Button>
                        )}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <BrandDialog brand={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={toDeactivate !== null}
        onOpenChange={(open) => !open && setToDeactivate(null)}
        title={`Eliminar ${toDeactivate?.name ?? ''}`}
        description="La marca deja de ofrecerse al registrar vehiculos nuevos. Los que ya la usan la conservan, asi que su historial no se rompe. Puedes reactivarla cuando quieras."
        confirmLabel="Eliminar"
        destructive
        loading={updateBrand.isPending}
        onConfirm={() => {
          if (toDeactivate) {
            updateBrand.mutate({ id: toDeactivate.id, name: toDeactivate.name, isActive: false });
          }
          setToDeactivate(null);
        }}
      />
    </Card>
  );
}

function BrandDialog({
  brand,
  open,
  onOpenChange,
}: {
  brand?: VehicleBrand;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(brand);
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandFormSchema),
    defaultValues: { name: brand?.name ?? '', isActive: brand?.isActive ?? true },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset({ name: brand?.name ?? '', isActive: brand?.isActive ?? true });
  }, [open, brand, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && brand) {
        await updateBrand.mutateAsync({ id: brand.id, name: values.name, isActive: values.isActive });
      } else {
        await createBrand.mutateAsync({ name: values.name });
      }
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['name', 'isActive'] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar marca' : 'Nueva marca'}</DialogTitle>
          <DialogDescription>
            Las marcas no se eliminan: se desactivan para conservar el historico.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Nombre" htmlFor="name" error={errors.name} required>
            <Input {...fieldAria('name', errors.name)} placeholder="Toyota" {...register('name')} />
          </FormField>

          {isEdit && (
            <FormField label="Activa" htmlFor="isActive">
              <div className="flex h-9 items-center gap-2.5">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch id="isActive" checked={field.value ?? true} onCheckedChange={field.onChange} />
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  Disponible al registrar vehiculos
                </span>
              </div>
            </FormField>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Modelos -----------------------------------------------------------------

function ModelsPanel({ canWrite }: { canWrite: boolean }) {
  const modelsQuery = useModels({ includeInactive: true });
  const updateModel = useUpdateModel();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<VehicleModel | undefined>();
  const [toDeactivate, setToDeactivate] = React.useState<VehicleModel | null>(null);

  const models = modelsQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle>Modelos</CardTitle>
          <CardDescription>Cada modelo pertenece a una marca.</CardDescription>
        </div>
        {canWrite && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(undefined);
              setDialogOpen(true);
            }}
          >
            <Plus />
            Nuevo modelo
          </Button>
        )}
      </CardHeader>

      <CardContent className="px-0">
        {modelsQuery.isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : modelsQuery.isError ? (
          <ErrorState error={modelsQuery.error} onRetry={() => void modelsQuery.refetch()} />
        ) : models.length === 0 ? (
          <EmptyState icon={Tags} title="Sin modelos" description="Agrega el primer modelo." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Modelo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.id}>
                  <TableCell className="font-medium">{model.name}</TableCell>
                  <TableCell className="text-muted-foreground">{model.brandName}</TableCell>
                  <TableCell>
                    {model.isActive ? (
                      <Badge variant="green">Activo</Badge>
                    ) : (
                      <Badge variant="neutral">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canWrite && (
                      <span className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditing(model);
                            setDialogOpen(true);
                          }}
                          aria-label={`Editar ${model.name}`}
                        >
                          <Pencil />
                        </Button>

                        {model.isActive ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setToDeactivate(model)}
                            aria-label={`Eliminar ${model.name}`}
                          >
                            <Trash2 />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              updateModel.mutate({ id: model.id, name: model.name, isActive: true })
                            }
                            aria-label={`Reactivar ${model.name}`}
                          >
                            <RotateCcw />
                          </Button>
                        )}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ModelDialog model={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={toDeactivate !== null}
        onOpenChange={(open) => !open && setToDeactivate(null)}
        title={`Eliminar ${toDeactivate?.name ?? ''}`}
        description="El modelo deja de ofrecerse al registrar vehiculos nuevos. Los que ya lo usan lo conservan. Puedes reactivarlo cuando quieras."
        confirmLabel="Eliminar"
        destructive
        loading={updateModel.isPending}
        onConfirm={() => {
          if (toDeactivate) {
            updateModel.mutate({ id: toDeactivate.id, name: toDeactivate.name, isActive: false });
          }
          setToDeactivate(null);
        }}
      />
    </Card>
  );
}

function ModelDialog({
  model,
  open,
  onOpenChange,
}: {
  model?: VehicleModel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(model);
  const brandsQuery = useBrands();
  const createModel = useCreateModel();
  const updateModel = useUpdateModel();

  const brands = brandsQuery.data ?? [];

  const form = useForm<ModelFormValues>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      brandId: model?.brandId ?? '',
      name: model?.name ?? '',
      isActive: model?.isActive ?? true,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) {
      reset({
        brandId: model?.brandId ?? '',
        name: model?.name ?? '',
        isActive: model?.isActive ?? true,
      });
    }
  }, [open, model, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && model) {
        // El backend no permite mover un modelo de marca.
        await updateModel.mutateAsync({ id: model.id, name: values.name, isActive: values.isActive });
      } else {
        await createModel.mutateAsync({ brandId: values.brandId, name: values.name });
      }
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['brandId', 'name', 'isActive'] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar modelo' : 'Nuevo modelo'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Un modelo no se puede mover de marca.'
              : 'Elige la marca a la que pertenece el modelo.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Marca" htmlFor="brandId" error={errors.brandId} required>
            <Controller
              control={control}
              name="brandId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
                  <SelectTrigger id="brandId" aria-invalid={errors.brandId ? true : undefined}>
                    <SelectValue placeholder="Selecciona una marca" />
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

          <FormField label="Nombre" htmlFor="name" error={errors.name} required>
            <Input
              {...fieldAria('name', errors.name)}
              placeholder="Corolla Cross"
              {...register('name')}
            />
          </FormField>

          {isEdit && (
            <FormField label="Activo" htmlFor="isActive">
              <div className="flex h-9 items-center gap-2.5">
                <Controller
                  control={control}
                  name="isActive"
                  render={({ field }) => (
                    <Switch id="isActive" checked={field.value ?? true} onCheckedChange={field.onChange} />
                  )}
                />
                <span className="text-sm text-muted-foreground">
                  Disponible al registrar vehiculos
                </span>
              </div>
            </FormField>
          )}

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Categorias de gasto -----------------------------------------------------

const expenseCategorySchema = z.object({
  name: requiredText(100, 'El nombre de la categoria'),
  scope: z.enum(['general', 'vehicle'], { required_error: 'Selecciona el alcance' }),
});

type ExpenseCategoryValues = z.infer<typeof expenseCategorySchema>;

/**
 * Categorias de gasto.
 *
 * Solo se pueden crear. La API expone `GET /catalogs` y
 * `POST /catalogs/expense-categories` y nada mas: no hay `PATCH` ni `DELETE`,
 * asi que ni editarlas ni darlas de baja es posible desde aqui. Se avisa en
 * pantalla en vez de ofrecer un boton condenado a fallar.
 */
function ExpenseCategoriesPanel({ canWrite }: { canWrite: boolean }) {
  const categories = useExpenseCategories();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex flex-col gap-1">
          <CardTitle>Categorias de gasto</CardTitle>
          <CardDescription>
            El alcance decide si el gasto exige un vehiculo o es de la empresa.
          </CardDescription>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus />
            Nueva categoria
          </Button>
        )}
      </CardHeader>

      <CardContent className="px-0">
        {categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="Sin categorias"
            description="Agrega categorias para clasificar los gastos."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Categoria</TableHead>
                <TableHead>Alcance</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>
                    <StatusBadge meta={EXPENSE_SCOPE_META[category.scope]} />
                  </TableCell>
                  <TableCell>
                    {category.isActive ? (
                      <Badge variant="green">Activa</Badge>
                    ) : (
                      <Badge variant="neutral">Inactiva</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <div className="border-t border-border px-5 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Las categorias de gasto solo se pueden crear: la API todavia no expone endpoints para
          editarlas ni darlas de baja. Las marcas y los modelos si se pueden eliminar desde sus
          pestañas.
        </p>
      </div>

      <ExpenseCategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </Card>
  );
}

function ExpenseCategoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createCategory = useCreateExpenseCategory();

  const form = useForm<ExpenseCategoryValues>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: { name: '', scope: 'vehicle' },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  React.useEffect(() => {
    if (open) reset({ name: '', scope: 'vehicle' });
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createCategory.mutateAsync(values);
      onOpenChange(false);
    } catch (error) {
      handleFormError(error, setError, { knownFields: ['name', 'scope'] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva categoria de gasto</DialogTitle>
          <DialogDescription>
            El alcance no se puede cambiar despues: define como se imputa el gasto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label="Nombre" htmlFor="name" error={errors.name} required>
            <Input
              {...fieldAria('name', errors.name)}
              placeholder="Nacionalizacion / Aduana"
              {...register('name')}
            />
          </FormField>

          <FormField
            label="Alcance"
            htmlFor="scope"
            error={errors.scope}
            required
            hint="Por vehiculo exige indicar la unidad; general la prohibe."
          >
            <Controller
              control={control}
              name="scope"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle">Por vehiculo</SelectItem>
                    <SelectItem value="general">General de la empresa</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Crear categoria
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
