import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  DEMO,
  HOSPITAL_RATE_CENTS,
  SAMPLE_NOTE,
  answerQuestion,
  buildTasks,
  cardError,
  clockPreview,
  demoDischargeAt,
  doseInstants,
  englishSms,
  formatMoney,
  formatWhen,
  isPatientId,
  medQuestion,
  normalizePhone,
  parseDischarge,
  patientPath,
  utcFromChicago,
  validatePlan,
  volumeEstimate,
} from '../lib/plan'

const eightPm = utcFromChicago(2026, 10, 9, 20, 0)

describe('schedule', () => {
  it('formats the Friday 8 PM dose', () => {
    assert.equal(formatWhen(eightPm, 'en'), '8:00 PM on Friday, Oct 9')
    assert.equal(
      medQuestion('Ibuprofen', formatWhen(eightPm, 'en'), 'en'),
      'Have they taken their ibuprofen at 8:00 PM on Friday, Oct 9?',
    )
  })

  it('keeps three-times-daily doses inside 72 hours and includes Friday 8 PM', () => {
    const discharge = utcFromChicago(2026, 10, 9, 7, 0)
    const times = doseInstants(3, 7, discharge)
    assert.equal(times.length, 9)
    assert.ok(times.some((time) => formatWhen(time, 'en') === '8:00 PM on Friday, Oct 9'))
    assert.equal(clockPreview(3), '8:00 AM, 2:00 PM, and 8:00 PM')
  })

  it('anchors the demo discharge at 7 AM Central the same morning', () => {
    const now = new Date('2026-10-09T16:00:00.000Z')
    assert.equal(demoDischargeAt(now).toISOString(), utcFromChicago(2026, 10, 9, 7, 0).toISOString())
  })

  it('builds one verify task plus doses for the sample medications', () => {
    const parsed = parseDischarge(SAMPLE_NOTE)
    const discharge = utcFromChicago(2026, 10, 9, 7, 0)
    const tasks = buildTasks({
      patientId: DEMO.id,
      patientName: DEMO.name,
      doctorName: DEMO.doctorName,
      medications: parsed.medications,
      dischargeAt: discharge,
    })
    assert.equal(tasks.length, 25)
    assert.equal(tasks[0].id, 'jordan-ellis:verify')
    const evening = tasks.find(
      (task) =>
        task.medName === 'Ibuprofen' &&
        formatWhen(new Date(task.scheduledFor), 'en') === '8:00 PM on Friday, Oct 9',
    )
    assert.ok(evening)
  })
})

describe('parser', () => {
  it('reads the sample discharge note', () => {
    const parsed = parseDischarge(SAMPLE_NOTE)
    assert.equal(parsed.error, undefined)
    assert.deepEqual(parsed.warnings, [])
    assert.deepEqual(
      parsed.medications.map((med) => [med.name, med.dose, med.quantity, med.frequencyPerDay, med.durationDays]),
      [
        ['Ibuprofen', '600 mg', 1, 3, 7],
        ['Acetaminophen', '500 mg', 2, 4, 5],
        ['Enoxaparin', '40 mg', 1, 1, 14],
      ],
    )
    assert.match(parsed.physicalTherapy, /Passive range of motion/)
    assert.equal(parsed.equipment.length, 3)
  })

  it('reads a narrative discharge chart like Michael Carter', () => {
    const note = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures/michael-carter.txt'), 'utf8')
    const parsed = parseDischarge(note)
    assert.equal(parsed.error, undefined)
    assert.equal(parsed.name, 'Michael Carter')
    assert.equal(parsed.caregiverName, 'Emily Carter')
    assert.equal(parsed.caregiverPhone, '(202) 555-0143')
    assert.equal(parsed.doctorName, 'Jordan Lee, MD')
    assert.match(parsed.procedure || '', /lumbar fusion/)
    assert.deepEqual(parsed.equipment, ['Walker'])
    assert.match(parsed.physicalTherapy, /physical and occupational therapy/)
    assert.equal(parsed.medications.length, 0)
    assert.match(parsed.warnings.join(' '), /No medication doses/)
  })

  it('warns on a medication line that is not in the pipe format', () => {
    const parsed = parseDischarge('Medications\n- Ibuprofen 600 mg\n')
    assert.equal(parsed.medications.length, 0)
    assert.equal(parsed.warnings.length, 1)
    assert.ok(parsed.error)
  })
})

describe('texts and payments', () => {
  it('points each text at that patient page', () => {
    const href = `http://localhost:3000${patientPath(DEMO.id)}`
    const body = englishSms({
      caregiverName: DEMO.caregiverName,
      patientName: DEMO.name,
      doctorName: DEMO.doctorName,
      hospitalName: DEMO.hospitalName,
      kind: 'med',
      medName: 'Ibuprofen',
      href,
      whenLabel: '8:00 PM on Friday, Oct 9',
    })
    assert.match(body, /Have they taken their ibuprofen at 8:00 PM on Friday, Oct 9\?/)
    assert.match(body, /Patient page: http:\/\/localhost:3000\/p\/jordan-ellis$/)
    assert.equal(patientPath('jordan-ellis'), '/p/jordan-ellis')
    assert.equal(isPatientId('../admin'), false)
    assert.throws(() => patientPath('../admin'))
  })

  it('prices the hospital invoice and checks the mock card', () => {
    assert.equal(HOSPITAL_RATE_CENTS, 3500)
    assert.equal(formatMoney(3500), '$35.00')
    assert.equal(volumeEstimate(400)?.invoiceCents, 1_400_000)
    assert.equal(volumeEstimate(1.5), null)
    assert.equal(cardError('4242424242424242', '12/28', '123', new Date('2026-10-09T16:00:00Z')), null)
    assert.equal(cardError('4242', '12/28', '123'), 'Enter a 16-digit card number.')
    assert.equal(normalizePhone('(620) 555-0142'), '6205550142')
  })
})

describe('chart assistant', () => {
  it('answers from the medication on the chart', () => {
    const parsed = parseDischarge(SAMPLE_NOTE)
    const answer = answerQuestion('when is ibuprofen?', {
      name: DEMO.name,
      caregiverName: DEMO.caregiverName,
      doctorName: DEMO.doctorName,
      hospitalName: DEMO.hospitalName,
      summary: 'Summary',
      physicalTherapy: 'Range of motion.',
      equipment: parsed.equipment,
      medications: parsed.medications,
      tasks: [],
    }, 'en')
    assert.match(answer, /Ibuprofen 600 mg/)
    assert.match(answer, /3 times a day/)
  })
})

describe('validation', () => {
  it('accepts the demo chart and rejects a short phone number', () => {
    const parsed = parseDischarge(SAMPLE_NOTE)
    const good = validatePlan({
      ...DEMO,
      dischargeNote: SAMPLE_NOTE,
      summary: '',
      medications: parsed.medications,
      physicalTherapy: parsed.physicalTherapy,
      equipment: parsed.equipment,
    })
    assert.equal(good.ok, true)
    if (good.ok) assert.match(good.value.summary, /Morgan Ellis/)
    const bad = validatePlan({
      ...DEMO,
      phone: '555',
      dischargeNote: SAMPLE_NOTE,
      summary: 'Ready',
      medications: parsed.medications,
      physicalTherapy: parsed.physicalTherapy,
      equipment: parsed.equipment,
    })
    assert.equal(bad.ok, false)
  })
})
