// src/utils/models/usuarios.ts

export interface IUsuario {
  id: number;
  nombre: string;              // Prisma: name
  correo: string;              // Prisma: email
  estado: number;              // Puedes mapear status -> number (activo/inactivo)
  rol_id?: number;             // No existe rol_id en Prisma, pero lo dejamos por compatibilidad UI
  rol_nombre?: "ADMIN" | "CONTADOR" | "EMPRESA"; // Prisma enum Role
}

export interface IUsuarioForm {
  nombre: string;              // name
  correo: string;              // email
  user: string;                // username
  password: string;            // passwordHash en Prisma
  rol_id: number;              // compatibilidad con UI, pero realmente usarás "role" enum
}

export interface IRoles {
  id: number;
  nombre: "ADMIN" | "CONTADOR" | "EMPRESA"; // Prisma enum Role
}
