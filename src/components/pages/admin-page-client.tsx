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
  CardFooter,
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
import { Edit, Trash2, UserPlus, ShieldCheck, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorage from '@/hooks/use-local-storage';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';

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
    <Button
      type="submit"
      disabled={pending}
      className="w-full bg-destructive hover:bg-destructive/90"
    >
      {pending ? 'Verifying...' : 'Verify & Delete'}
      <ShieldCheck className="ml-2 size-4" />
    </Button>
  );
}

function ChangePasswordButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Saving...' : 'Save Password'}
      <Save className="ml-2 size-4" />
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

  const [adminPassword, setAdminPassword] = useLocalStorage<string>(
    'adminPassword',
    'Teamox76@'
  );

  const [selectedStaff, setSelectedStaff] = React.useState<Staff | null>(null);
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isVerifiedForDelete, setIsVerifiedForDelete] = React.useState(false);
  const [staffToDelete, setStaffToDelete] = React.useState<Staff | null>(null);

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  async function handleAddStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newStaff = {
      id: uuidv4(),
      name: formData.get('name') as string,
      hourlyRate: parseFloat(formData.get('hourlyRate') as string),
    };

    if (!newStaff.name || newStaff.hourlyRate <= 0) {
      toast({
        title: 'Error',
        description: 'Please provide a valid name and hourly rate.',
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
    const updatedStaff = {
      id: selectedStaff.id,
      name: formData.get('name') as string,
      hourlyRate: parseFloat(formData.get('hourlyRate') as string),
    };

    if (!updatedStaff.name || updatedStaff.hourlyRate <= 0) {
      toast({
        title: 'Error',
        description: 'Please provide a valid name and hourly rate.',
        variant: 'destructive',
      });
      return;
    }

    const staffDocRef = doc(firestore, 'staff', updatedStaff.id);
    updateDocumentNonBlocking(staffDocRef, updatedStaff);
    toast({ title: 'Success', description: 'Staff member updated.' });
    setEditDialogOpen(false);
  }

  function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password') as string;
    if (password === adminPassword) {
      toast({ title: 'Success', description: 'Verification successful.' });
      setIsVerifiedForDelete(true);
    } else {
      toast({
        title: 'Verification Failed',
        description: 'Incorrect password.',
        variant: 'destructive',
      });
      setIsVerifiedForDelete(false);
    }
  }

  const handleChangePassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (currentPassword !== adminPassword) {
      toast({
        title: 'Error',
        description: 'Current password is not correct.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }
    setAdminPassword(newPassword);
    toast({ title: 'Success', description: 'Admin password updated successfully.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleDelete = async (staffId: string) => {
    const staffDocRef = doc(firestore, 'staff', staffId);
    deleteDocumentNonBlocking(staffDocRef);
    setDeleteDialogOpen(false);
    toast({
      title: 'Success',
      description: 'Staff member deleted.',
    });
  };

  React.useEffect(() => {
    if (isVerifiedForDelete && staffToDelete) {
      handleDelete(staffToDelete.id);
      setIsVerifiedForDelete(false);
      setStaffToDelete(null);
    }
  }, [isVerifiedForDelete, staffToDelete]);

  const handleEditClick = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (staffMember: Staff) => {
    setStaffToDelete(staffMember);
    setIsVerifiedForDelete(false);
    setDeleteDialogOpen(true);
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
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" placeholder="John Doe" />
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
          <Card>
            <form onSubmit={handleChangePassword}>
              <CardHeader>
                <CardTitle>Change Admin Password</CardTitle>
                <CardDescription>
                  Update the password used for verifying sensitive actions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    name="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    name="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter>
                <ChangePasswordButton />
              </CardFooter>
            </form>
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
                        <TableCell>{s.name}</TableCell>
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
                <DialogTitle>Edit Staff: {selectedStaff.name}</DialogTitle>
                <DialogDescription>
                  Update the details for this staff member.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateStaff}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Full Name</Label>
                    <Input
                      id="edit-name"
                      name="name"
                      defaultValue={selectedStaff.name}
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

        {staffToDelete && (
          <Dialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <form onSubmit={handleVerify}>
                <DialogHeader>
                  <DialogTitle>Verify Deletion</DialogTitle>
                  <DialogDescription>
                    To permanently delete {staffToDelete.name}, please enter
                    the admin password. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Admin Password</Label>
                    <Input id="password" name="password" type="password" required />
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
