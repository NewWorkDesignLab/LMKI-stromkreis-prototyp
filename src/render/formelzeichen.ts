/* Formelzeichen im Text wie an der Tafel: ein einzelnes U, R oder I, wahlweise mit _Index
   („R_ges“) und einem Satzzeichen dahinter. Gilt für Formeln im Text (Formel.tsx) und für
   Beschriftungen am Brett. */
export const FORMELZEICHEN = /^([URI])(?:_([A-Za-zäöüÄÖÜß]+))?([,.;:]?)$/;
