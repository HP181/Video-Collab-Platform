"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { UserListItem, getInvitableUsers, sendWorkspaceInvitation } from "@/actions/invitation";

type UserSelectorProps = {
  workspaceId: string;
  onSuccess?: () => void;
};

// Define form validation schema
const invitationFormSchema = z.object({
  email: z.string().email({
    message: "Please select a valid user.",
  }),
  role: z.enum(["admin", "member", "viewer"], {
    required_error: "Please select a role.",
  }),
});

type InvitationFormValues = z.infer<typeof invitationFormSchema>;

export function UserInviteSelector({ workspaceId, onSuccess }: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form
  const form = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });
  
  // Fetch users when the component mounts or dialog opens
  useEffect(() => {
    async function fetchUsers() {
      if (open) {
        setLoading(true);
        const response = await getInvitableUsers(workspaceId);
        
        if (response.success) {
          setUsers(response.users);
        } else {
          toast.error(response.error || "Failed to load users", {
            description: response.error || "Failed to load users",
          });
        }
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, [workspaceId, open, toast]);

  // Handle form submission
  async function onSubmit(values: InvitationFormValues) {
    setIsSubmitting(true);
    
    try {
      const response = await sendWorkspaceInvitation(workspaceId, {
        email: values.email,
        role: values.role,
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      toast.success("Invitation sent", {
        description: `An invitation has been sent to the selected user.`,
      });
      
      // Reset form
      form.reset();
      
      // Close dialog
      setOpen(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.success(error.message || "Failed to send invitation", {
        description: error.message || "Failed to send invitation",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Get initials from name for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Filter users based on search value
  const filteredUsers = searchValue
    ? users.filter(
        user =>
          user.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          user.email.toLowerCase().includes(searchValue.toLowerCase())
      )
    : users;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite a Team Member</DialogTitle>
          <DialogDescription>
            Invite a user to join your workspace. They'll receive an email with a link to accept.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>User</FormLabel>
                  <Popover open={commandOpen} onOpenChange={setCommandOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={commandOpen}
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? users.find(user => user.email === field.value)?.name || field.value
                            : "Select a user"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Search users..." 
                          onValueChange={setSearchValue}
                          value={searchValue}
                        />
                        {loading ? (
                          <div className="py-6 text-center text-sm">Loading users...</div>
                        ) : (
                          <CommandList>
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              {filteredUsers.map((user) => (
                                <CommandItem
                                  key={user.email}
                                  value={user.email}
                                  onSelect={() => {
                                    form.setValue("email", user.email);
                                    setCommandOpen(false);
                                    setSearchValue("");
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={user.profileImage} />
                                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                      <span>{user.name}</span>
                                      <span className="text-xs text-muted-foreground">{user.email}</span>
                                    </div>
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      field.value === user.email
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        )}
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}