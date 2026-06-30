import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Please enter your name").max(100),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(7, "Please enter a valid phone number").max(20),
  message: z.string().min(10, "Please tell us a little more").max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;
