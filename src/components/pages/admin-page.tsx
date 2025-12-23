'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  addStaff,
  updateStaff,
  deleteStaff,
  type State,
} from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Staff } from '@/lib/definitions';
import { Edit, Trash2, UserPlus } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

function AddStaffSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
    >
      {pending ? 'Adding...' : 'Add Staff'}
      <UserPlus className="ml-2 size-4" />
    </Button>
  );
}
function UpdateStaffSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

export default function AdminPage() {
  const { toast } = useToast();
  const addFormRef = React.useRef<HTMLFormElement>(null);
  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);

  const firestore = useFirestore();
  const staffCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'staff') : null),
    [firestore]
  );
  const { data: staff, isLoading } = useCollection<Staff>(staffCollection);

  const addInitialState: State = { message: null, errors: {} };
  const [addState, addDispatch] = useActionState(addStaff, addInitialState);

  const updateInitialState: State = { message: null, errors: {} };
  const [updateState, updateDispatch] = useActionState(
    updateStaff,
    updateInitialState
  );

  React.useEffect(() => {
    if (addState.message) {
      if (addState.errors && Object.keys(addState.errors).length > 0) {
        toast({
          title: 'Error',
          description: addState.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Success', description: addState.message });
        addFormRef.current?.reset();
      }
    }
  }, [addState, toast]);

  React.useEffect(() => {
    if (updateState.message) {
      if (updateState.errors && Object.keys(updateState.errors).length > 0) {
        toast({
          title: 'Error',
          description: updateState.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Success', description: updateState.message });
        setEditDialogOpen(false);
      }
    }
  }, [updateState, toast]);

  const handleDelete = async (staffId: string) => {
    const result = await deleteStaff(staffId);
    if (result.message) {
      toast({
        title: result.message.startsWith('Database Error') ? 'Error' : 'Success',
        description: result.message,
        variant: result.message.startsWith('Database Error') ? 'destructive' : 'default',
      });
    }
  };

  const handleEditClick = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setEditDialogOpen(true);
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add New Staff</CardTitle>
            <CardDescription>
              Enter the details for a new staff member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={addFormRef} action={addDispatch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" placeholder="John Doe" />
                {addState.errors?.name && (
                  <p className="text-sm font-medium text-destructive">
                    {addState.errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john.doe@example.com"
                />
                {addState.errors?.email && (
                  <p className="text-sm font-medium text-destructive">
                    {addState.errors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" />
                {addState.errors?.password && (
                  <p className="text-sm font-medium text-destructive">
                    {addState.errors.password}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  step="0.01"
                  placeholder="20.00"
                />
                {addState.errors?.hourlyRate && (
                  <p className="text-sm font-medium text-destructive">
                    {addState.errors.hourlyRate}
                  </p>
                )}
              </div>
              <AddStaffSubmitButton />
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Staff List</CardTitle>
            <CardDescription>
              A list of all current staff members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Loading staff...
                    </TableCell>
                  </TableRow>
                ) : staff && staff.length > 0 ? (
                  staff.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                       <TableCell>{s.email}</TableCell>
                      <TableCell>
                        {s.hourlyRate.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(s)}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete {s.name} and all their
                                associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(s.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No staff members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {selectedStaff && (
        <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Staff: {selectedStaff.name}</DialogTitle>
              <DialogDescription>
                Update the details for this staff member.
              </DialogDescription>
            </DialogHeader>
            <form action={updateDispatch}>
              <input type="hidden" name="id" value={selectedStaff.id} />
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={selectedStaff.name}
                  />
                  {updateState.errors?.name && (
                    <p className="text-sm font-medium text-destructive">
                      {updateState.errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="edit-hourlyRate"
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    defaultValue={selectedStaff.hourlyRate}
                  />
                  {updateState.errors?.hourlyRate && (
                    <p className="text-sm font-medium text-destructive">
                      {updateState.errors.hourlyRate}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
                <UpdateStaffSubmitButton />
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
