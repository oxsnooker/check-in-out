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
  DialogClose,
} from '@/components/ui/dialog';
import type { Staff, AttendanceRecord, AdvancePayment } from '@/lib/definitions';
import { Edit, Trash2, UserPlus, KeyRound } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { collection, doc, getDocs, query, where, Timestamp } from 'firebase/firestore';
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
import { calculateWorkingHours, toDate } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const ADMIN_PASSWORD = 'faz&aks76@';
const STAFF_MANAGEMENT_PASSWORD = 'Faz&aks76@';

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

interface SalaryData {
    staffId: string;
    staffName: string;
    totalHours: number;
    hourlyRate: number;
    salaryAmount: number;
    totalAdvance: number;
    balance: number;
}

function SalaryOverview() {
    const firestore = useFirestore();
    const [salaryData, setSalaryData] = React.useState<SalaryData[]>([]);
    const [isLoadingSalaries, setIsLoadingSalaries] = React.useState(true);
    const [selectedMonth, setSelectedMonth] = React.useState<number | null>(null);
    const [selectedYear, setSelectedYear] = React.useState<number | null>(null);
    
    React.useEffect(() => {
        const currentDate = new Date();
        setSelectedMonth(currentDate.getMonth());
        setSelectedYear(currentDate.getFullYear());
    }, []);

    const staffCollRef = useMemoFirebase(
        () => collection(firestore, 'staff'),
        [firestore]
    );
    const { data: staff, isLoading: isLoadingStaff } = useCollection<Staff>(staffCollRef);

    const monthOptions = Array.from({ length: 12 }, (_, i) => ({
      value: i,
      label: format(new Date(0, i), 'MMMM'),
    }));
  
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    React.useEffect(() => {
        if (!staff || selectedMonth === null || selectedYear === null) return;

        const fetchAllData = async () => {
            setIsLoadingSalaries(true);
            const allSalaryData: SalaryData[] = [];

            const monthStartDate = startOfMonth(new Date(selectedYear, selectedMonth));
            const monthEndDate = endOfMonth(monthStartDate);

            for (const staffMember of staff) {
                const attendanceQuery = query(collection(firestore, `staff/${staffMember.id}/attendanceRecords`), where('date', '>=', monthStartDate), where('date', '<=', monthEndDate));
                const advancesQuery = query(collection(firestore, `staff/${staffMember.id}/advancePayments`), where('date', '>=', monthStartDate), where('date', '<=', monthEndDate));

                const [attendanceSnapshot, advancesSnapshot] = await Promise.all([
                    getDocs(attendanceQuery),
                    getDocs(advancesQuery),
                ]);

                const allAttendance = attendanceSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AttendanceRecord));
                const allAdvances = advancesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AdvancePayment));

                const totalHours = allAttendance.reduce((acc, record) => {
                    if (record.isAbsent) return acc;
                    const hours1 = calculateWorkingHours(toDate(record.timeIn), toDate(record.timeOut));
                    const hours2 = calculateWorkingHours(toDate(record.timeIn2), toDate(record.timeOut2));
                    return acc + hours1 + hours2;
                }, 0);

                const totalAdvance = allAdvances.reduce(
                    (acc, payment) => acc + payment.amount,
                    0
                );

                const salaryAmount = totalHours * staffMember.hourlyRate;
                const balance = salaryAmount - totalAdvance;

                allSalaryData.push({
                    staffId: staffMember.id,
                    staffName: `${staffMember.firstName} ${staffMember.lastName}`,
                    totalHours,
                    hourlyRate: staffMember.hourlyRate,
                    salaryAmount,
                    totalAdvance,
                    balance,
                });
            }
            setSalaryData(allSalaryData);
            setIsLoadingSalaries(false);
        };

        fetchAllData();
    }, [staff, firestore, selectedMonth, selectedYear]);
    
    if (selectedMonth === null || selectedYear === null) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Salary Overview</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Total Hours</TableHead>
                                <TableHead>Gross Salary</TableHead>
                                <TableHead>Total Advance</TableHead>
                                <TableHead>Balance Payable</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Initializing...
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
             </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Salary Overview</CardTitle>
                <CardDescription>
                    A summary of salary details for all staff members.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                 <Select
                    onValueChange={(value) => setSelectedMonth(Number(value))}
                    value={String(selectedMonth)}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={String(month.value)}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    onValueChange={(value) => setSelectedYear(Number(value))}
                    value={String(selectedYear)}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
              </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Total Hours</TableHead>
                            <TableHead>Gross Salary</TableHead>
                            <TableHead>Total Advance</TableHead>
                            <TableHead>Balance Payable</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingSalaries || isLoadingStaff ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Loading salaries...
                                </TableCell>
                            </TableRow>
                        ) : salaryData && salaryData.length > 0 ? (
                            salaryData.map((s) => (
                                <TableRow key={s.staffId}>
                                    <TableCell>{s.staffName}</TableCell>
                                    <TableCell>{s.totalHours.toFixed(2)} hrs</TableCell>
                                    <TableCell>{s.salaryAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                    <TableCell className="text-red-600">{s.totalAdvance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                    <TableCell className="font-bold">{s.balance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No salary data available.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export default function AdminPageClient() {
  const { toast } = useToast();
  const addFormRef = React.useRef<HTMLFormElement>(null);
  const firestore = useFirestore();

  const [isVerified, setIsVerified] = React.useState(false);
  const [passwordInput, setPasswordInput] = React.useState('');
  
  const [isStaffManagementUnlocked, setIsStaffManagementUnlocked] = React.useState(false);
  const [staffManagementPasswordInput, setStaffManagementPasswordInput] = React.useState('');

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
      password: formData.get('password') as string,
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

    const password = formData.get('password') as string;
    if (password) {
      updatedStaff.password = password;
    }

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

  const handleVerification = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsVerified(true);
      toast({
        title: 'Success',
        description: 'Password verified. Admin panel unlocked.',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Incorrect password. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStaffManagementVerification = () => {
    if (staffManagementPasswordInput === STAFF_MANAGEMENT_PASSWORD) {
      setIsStaffManagementUnlocked(true);
      toast({
        title: 'Success',
        description: 'Staff management unlocked.',
      });
    } else {
      toast({
        title: 'Error',
        description: 'Incorrect password for staff management.',
        variant: 'destructive',
      });
    }
  };

  if (!isVerified) {
    return (
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle>Admin Access Required</CardTitle>
          <CardDescription>Enter the admin password to manage staff.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              placeholder="Admin Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerification()}
            />
          </div>
           <Button onClick={handleVerification} className="w-full">
            <KeyRound className="mr-2 size-4" />
            Unlock Admin Panel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {!isStaffManagementUnlocked ? (
          <Card className="mx-auto max-w-sm">
            <CardHeader>
              <CardTitle>Staff Management Access</CardTitle>
              <CardDescription>Enter the password to add, edit, or remove staff.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staff-management-password">Password</Label>
                <Input
                  id="staff-management-password"
                  type="password"
                  placeholder="Staff Management Password"
                  value={staffManagementPasswordInput}
                  onChange={(e) => setStaffManagementPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStaffManagementVerification()}
                />
              </div>
               <Button onClick={handleStaffManagementVerification} className="w-full">
                <KeyRound className="mr-2 size-4" />
                Unlock Staff Management
              </Button>
            </CardContent>
          </Card>
        ) : (
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
                      <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                      <Input
                        id="hourlyRate"
                        name="hourlyRate"
                        type="number"
                        step="0.01"
                        placeholder="150.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
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
                              {s.hourlyRate.toLocaleString('en-IN', {
                                style: 'currency',
                                currency: 'INR',
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
          </div>
        )}

        <SalaryOverview />
        
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
                    <Label htmlFor="edit-hourlyRate">Hourly Rate (₹)</Label>
                    <Input
                      id="edit-hourlyRate"
                      name="hourlyRate"
                      type="number"
                      step="0.01"
                      defaultValue={selectedStaff.hourlyRate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-password">Password</Label>
                    <Input
                      id="edit-password"
                      name="password"
                      type="password"
                      placeholder="Enter new password (optional)"
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
