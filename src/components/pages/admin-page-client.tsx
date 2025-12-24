'use client';

import * as React from 'react';
import { useFormStatus } from 'react-dom';
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
import { Edit, Trash2, UserPlus } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
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

export default function AdminPageClient() {
  const { toast } = useToast();
  const addFormRef = React.useRef<HTMLFormElement>(null);
  const firestore = useFirestore();

  const staffCollRef = useMemoFirebase(
    () => collection(firestore, 'staff'),
    [firestore]
  );
  const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollRef);

  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  
  async function handleAddStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newStaff: Omit<Staff, 'id'> = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      hourlyRate: parseFloat(formData.get('hourlyRate') as string),
    };

    if (!newStaff.firstName || !newStaff.lastName || newStaff.hourlyRate <= 0) {
      toast({
        title: 'Error',
        description: 'Please provide valid first name, last name and hourly rate.',
        variant: 'destructive',
      });
      return;
    }

    addDocumentNonBlocking(staffCollRef, newStaff);
    toast({ title: 'Success', description: 'Staff member added.' });
    addFormRef.current?.reset();
  }

  async function handleUpdateStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStaff) return;
    const formData = new FormData(event.currentTarget);
    const updatedStaff: Partial<Staff> = {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      hourlyRate: parseFloat(formData.get('hourlyRate') as string),
    };

    if (!updatedStaff.firstName || !updatedStaff.lastName || !updatedStaff.hourlyRate || updatedStaff.hourlyRate <= 0) {
      toast({
        title: 'Error',
        description: 'Please provide a valid name and hourly rate.',
        variant: 'destructive',
      });
      return;
    }

    const staffDocRef = doc(firestore, 'staff', selectedStaff.id);
    updateDocumentNonBlocking(staffDocRef, updatedStaff);
    toast({ title: 'Success', description: 'Staff member updated.' });
    setEditDialogOpen(false);
  }

  const handleDelete = async (staffId: string) => {
    const staffDocRef = doc(firestore, 'staff', staffId);
    deleteDocumentNonBlocking(staffDocRef);
    toast({
      title: 'Success',
      description: 'Staff member deleted.',
    });
  };

  const handleEditClick = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setEditDialogOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Staff</CardTitle>
              <CardDescription>
                Enter the details for a new staff member.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form ref={addFormRef} onSubmit={handleAddStaff} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" placeholder="Doe" />
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
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingStaff ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        Loading staff...
                      </TableCell>
                    </TableRow>
                  ) : staff && staff.length > 0 ? (
                    staff.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.firstName} {s.lastName}</TableCell>
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
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the staff member and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(s.id)}>
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
                      <TableCell colSpan={3} className="h-24 text-center">
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
                <DialogTitle>Edit Staff: {selectedStaff.firstName} {selectedStaff.lastName}</DialogTitle>
                <DialogDescription>
                  Update the details for this staff member.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateStaff}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-firstName">First Name</Label>
                    <Input
                      id="edit-firstName"
                      name="firstName"
                      defaultValue={selectedStaff.firstName}
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="edit-lastName">Last Name</Label>
                    <Input
                      id="edit-lastName"
                      name="lastName"
                      defaultValue={selectedStaff.lastName}
                    />
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
    </>
  );
}