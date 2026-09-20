import type { Locale } from "./types";
import { funcionalidadesCopy } from "./copy/funcionalidades";
import { comoFuncionaCopy } from "./copy/como-funciona";
import { preciosCopy } from "./copy/precios";
import { preguntasCopy } from "./copy/preguntas";
import { contactoCopy } from "./copy/contacto";
import { legalCopy } from "./copy/legal";
import { sobreCopy } from "./copy/sobre";

export const getFuncionalidades = (l: Locale) => funcionalidadesCopy[l];
export const getComoFunciona = (l: Locale) => comoFuncionaCopy[l];
export const getPrecios = (l: Locale) => preciosCopy[l];
export const getPreguntas = (l: Locale) => preguntasCopy[l];
export const getContacto = (l: Locale) => contactoCopy[l];
export const getLegal = (l: Locale) => legalCopy[l];
export const getSobre = (l: Locale) => sobreCopy[l];
