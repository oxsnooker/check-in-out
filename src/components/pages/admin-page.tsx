'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addStaff, updateStaff, deleteStaff, type State } from '@/lib/actions';
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
import type { Staff } from '@/lib/definitions';
import { MOCK_STAFF } from '@/lib/data';
import { Edit, Trash2, UserPlus, ShieldCheck } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '@/hooks/use-local-storage';

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

function VerifyButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full bg-destructive hover:bg-destructive/90">
            {pending ? 'Verifying...' : 'Verify & Delete'}
            <ShieldCheck className="ml-2 size-4" />
        </Button>
    );
}

export default function AdminPage() {
  const { toast } = useToast();
  const addFormRef = React.useRef<HTMLFormElement>(null);
  
  const [staff, setStaff] = useLocalStorage<Staff[]>('staff', MOCK_STAFF);
  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isVerifiedForDelete, setIsVerifiedForDelete] = React.useState(false);
  const [staffToDelete, setStaffToDelete] = React.useState<Staff | null>(null);

  const addInitialState: State = { message: null, errors: {} };
  const [addState, addDispatch] = useActionState(handleAddStaff, addInitialState);

  const updateInitialState: State = { message: null, errors: {} };
  const [updateState, updateDispatch] = useActionState(handleUpdateStaff, updateInitialState);
  
  const verifyInitialState: State = { message: null, errors: {} };
  const [verifyState, verifyDispatch] = useActionState(handleVerify, verifyInitialState);


  async function handleAddStaff(prevState: State, formData: FormData) {
      const result = await addStaff(prevState, formData);
      if (result.message) {
        if(result.errors && Object.keys(result.errors).length > 0){
             toast({
                title: 'Error',
                description: result.message,
                variant: 'destructive',
            });
        } else {
            const newStaff: Staff = {
                id: uuidv4(),
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                hourlyRate: parseFloat(formData.get('hourlyRate') as string)
            };
            setStaff(prev => [...prev, newStaff]);
            toast({ title: 'Success', description: result.message });
            addFormRef.current?.reset();
        }
      }
      return result;
  }
  
  async function handleUpdateStaff(prevState: State, formData: FormData) {
      const result = await updateStaff(prevState, formData);
       if (result.message) {
            if (result.errors && Object.keys(result.errors).length > 0) {
                toast({
                    title: 'Error',
                    description: result.message,
                    variant: 'destructive',
                });
            } else {
                const updatedStaff: Staff = {
                    id: formData.get('id') as string,
                    name: formData.get('name') as string,
                    hourlyRate: parseFloat(formData.get('hourlyRate') as string)
                };
                setStaff(prev => prev.map(s => s.id === updatedStaff.id ? { ...s, ...updatedStaff } : s));
                toast({ title: 'Success', description: result.message });
                setEditDialogOpen(false);
            }
        }
        return result;
  }

  async function handleVerify(prevState: State, formData: FormData) {
    // This is a mock verification. In a real app, it would check a password.
    const password = formData.get('password') as string;
    if (password) {
        setIsVerifiedForDelete(true);
        return { message: 'Verification successful.' };
    }
    return { message: 'Verification failed.', errors: {password: ['Incorrect password']}};
  }


  React.useEffect(() => {
    if (verifyState.message) {
        if (verifyState.errors && Object.keys(verifyState.errors).length > 0) {
            toast({
                title: 'Verification Failed',
                description: verifyState.message,
                variant: 'destructive',
            });
            setIsVerifiedForDelete(false);
        } else {
            toast({ title: 'Success', description: verifyState.message });
            setIsVerifiedForDelete(true);
        }
    }
  }, [verifyState, toast]);

  const handleDelete = async (staffId: string) => {
    const result = await deleteStaff(staffId);
    toast({
        title: result.success ? 'Success' : 'Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
    });
    if (result.success) {
      setStaff(prev => prev.filter(s => s.id !== staffId));
      setDeleteDialogOpen(false);
    }
  };

  React.useEffect(() => {
    if (isVerifiedForDelete && staffToDelete) {
      handleDelete(staffToDelete.id);
      // We don't close the dialog here anymore, handleDelete will do it on success
    }
  }, [isVerifiedForDelete, staffToDelete]);


  const handleEditClick = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setEditDialogOpen(true);
  };
  
  const openDeleteDialog = (staffMember: Staff) => {
    setStaffToDelete(staffMember);
    setIsVerifiedForDelete(false); // Reset verification state
    setDeleteDialogOpen(true);
  }

  return (
    <>
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
                  {staff && staff.length > 0 ? (
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
                          <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => openDeleteDialog(s)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
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
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      name="email"
                      type="email"
                      defaultValue={selectedStaff.email}
                    />
                    {updateState.errors?.email && (
                      <p className="text-sm font-medium text-destructive">
                        {updateState.errors.email}
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
        
        {staffToDelete && (
          <Dialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                  <form action={verifyDispatch}>
                      <DialogHeader>
                          <DialogTitle>Verify Deletion</DialogTitle>
                          <DialogDescription>
                              To permanently delete {staffToDelete.name}, please enter your password. This action cannot be undone.
                          </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                          <div className="space-y-2">
                              <Label htmlFor="password">Password</Label>
                              <Input
                              id="password"
                              name="password"
                              type="password"
                              required
                              />
                              {verifyState?.errors?.password && (
                              <p className="text-sm font-medium text-destructive">
                                  {verifyState.errors.password}
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
                        <VerifyButton />
                      </DialogFooter>
                  </form>
              </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}
