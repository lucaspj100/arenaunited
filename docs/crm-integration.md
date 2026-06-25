# Integração CRM (Funil Pro → Arena)

## Endpoint

```
POST https://arenaunited.lovable.app/api/public/crm-webhook
Content-Type: application/json
X-CRM-Signature: <hmac_sha256_hex(rawBody, CRM_WEBHOOK_SECRET)>
```

A assinatura é HMAC-SHA256 do corpo bruto (string) usando o segredo
compartilhado `CRM_WEBHOOK_SECRET`. Compara-se em tempo constante; payload
sem assinatura válida retorna **401**.

## Payload

```json
{
  "event_type": "crm_interview_scheduled",
  "crm_lead_id": "lead-abc-123",
  "crm_user_id": "00000000-0000-0000-0000-000000000000",
  "lead_name": "Maria Silva",
  "lead_phone": "+5511999990000",
  "interview_date": "2026-07-15",
  "interview_time": "14:30",
  "interview_notes": "Lead aquecido pelo Instagram",
  "enrollment_value": 1500,
  "monthly_fee": 350,
  "material_value": 800,
  "status": "marcada",
  "occurred_at": "2026-07-10T18:22:00Z"
}
```

### Eventos suportados

| event_type                   | Efeito na Arena                                              |
|------------------------------|--------------------------------------------------------------|
| `crm_interview_scheduled`    | Cria/atualiza entrevista (status `marcada`)                  |
| `crm_interview_done`         | Cria/atualiza entrevista (status `realizada`)                |
| `crm_interview_no_show`      | Atualiza entrevista existente para `nao_compareceu`          |
| `crm_interview_rescheduled`  | Atualiza data/hora + status `reagendada`                     |
| `crm_enrollment_created`     | Cria matrícula `approved` (se nova) + fecha entrevista       |
| `crm_lost_after_interview`   | Marca entrevista existente como `perdida`                    |

## Regras

- Eventos de `crm_user_id` **sem vínculo ativo** em `crm_arena_seller_links`
  são registrados com status `ignored` e **não afetam** agenda/ranking.
- Deduplicação por `(seller_id, crm_lead_id)` em entrevistas e matrículas.
- O mesmo `crm_lead_id` não gera matrícula duplicada e não cria entrevistas
  repetidas — atualiza a existente.
- Resposta sempre `200` (exceto assinatura inválida 401, payload inválido
  400 ou secret não configurado 500), com `{ status: "processed"|"ignored" }`
  ou `{ ok: false, error }`.

## Exemplo (curl)

```bash
SECRET="..."  # CRM_WEBHOOK_SECRET
BODY='{"event_type":"crm_interview_scheduled","crm_lead_id":"lead-1","crm_user_id":"00000000-0000-0000-0000-000000000000","lead_name":"Teste","interview_date":"2026-07-15","interview_time":"14:30"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -hex | awk '{print $2}')
curl -X POST https://arenaunited.lovable.app/api/public/crm-webhook \
  -H "Content-Type: application/json" \
  -H "X-CRM-Signature: $SIG" \
  --data "$BODY"
```

## Administração

Acessível apenas a admin/diretor/CEO/presidente em `/integracoes`:
- **Vínculos**: associar `crm_user_id` ↔ vendedor da Arena, ativar/desativar.
- **Logs**: ver todos os eventos recebidos, status e payload completo.