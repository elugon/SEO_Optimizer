export const HTTP_ERROR_MESSAGES = {
  400: 'Solicitud incorrecta',
  401: 'No autorizado',
  403: 'Acceso prohibido',
  404: 'Página no encontrada',
  408: 'Tiempo de respuesta agotado',
  429: 'Demasiadas solicitudes',
  500: 'Error interno del servidor',
  502: 'Gateway incorrecto',
  503: 'Servicio no disponible',
  504: 'Tiempo de gateway agotado'
} as const;

export type HttpErrorCode = keyof typeof HTTP_ERROR_MESSAGES;

export function getHttpErrorMessage(statusCode: number): string {
  return HTTP_ERROR_MESSAGES[statusCode as HttpErrorCode] || `Error HTTP ${statusCode}`;
}