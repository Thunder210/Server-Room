import { z } from 'zod'

export const ipv4 = z.string().regex(/^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){2}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/)
export const mac = z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/)
export const deviceKind = z.enum(['SERVER','SWITCH','CUSTOM'])

export const deviceInput = z.object({
  rack_id: z.string().min(1),
  kind: deviceKind,
  label: z.string().min(1),
  ips: z.array(z.object({ address: ipv4 })).max(256),
  macs: z.array(z.object({ address: mac })).max(256)
})
