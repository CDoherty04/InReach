import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  ANNUAL_RATE_CENTS,
  answerQuestion,
  buildTasks,
  cardError,
  clockPreview,
  dischargeMorningAnchor,
  doseInstants,
  englishSms,
  formatMoney,
  formatWhen,
  isPatientId,
  medQuestion,
  normalizePhone,
  normalizeDischargeText,
  parseDischarge,
  patientPath,
  utcFromChicago,
  validatePlan,
  volumeEstimate,
} from '../lib/plan'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const sampleNote = readFileSync(join(fixturesDir, 'sample-note.txt'), 'utf8')

const samplePatient = {
  id: 'jordan-ellis',
  name: 'Jordan Ellis',
  phone: '6205550142',
  caregiverName: 'Morgan Ellis',
  caregiverPhone: '6205550199',
  doctorName: 'Dr. Elena Vasquez',
  hospitalName: 'Plains Regional Hospital',
  city: 'Great Bend, Kansas',
}

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

  it('anchors discharge at 7 AM Central the same morning', () => {
    const now = new Date('2026-10-09T16:00:00.000Z')
    assert.equal(dischargeMorningAnchor(now).toISOString(), utcFromChicago(2026, 10, 9, 7, 0).toISOString())
  })

  it('builds one verify task plus doses for the sample medications', () => {
    const parsed = parseDischarge(sampleNote)
    const discharge = utcFromChicago(2026, 10, 9, 7, 0)
    const tasks = buildTasks({
      patientId: samplePatient.id,
      patientName: samplePatient.name,
      doctorName: samplePatient.doctorName,
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
    const parsed = parseDischarge(sampleNote)
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
    const note = readFileSync(join(fixturesDir, 'michael-carter.txt'), 'utf8')
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
  })

  it('warns on a medication line that is not in the pipe format', () => {
    const parsed = parseDischarge('Medications\n- Ibuprofen 600 mg\n')
    assert.equal(parsed.medications.length, 0)
    assert.ok(parsed.error)
  })

  it('reads pipe medications when PDF text glues section headers onto one line', () => {
    const smashed =
      'Jordan Ellis Rural Kansas. Paralyzed after a car crash. Transferred between hospitals before discharge home to Great Bend. Medications - Ibuprofen | 600 mg | qty 1 | every 8 hours | 7 days - Acetaminophen | 500 mg | qty 2 | every 6 hours | 5 days - Enoxaparin | 40 mg | qty 1 | every 24 hours | 14 days Physical therapy Passive range of motion twice a day. Equipment - Wheelchair, 18 inch - Pressure-relief cushion - Hospital bed with rails'
    const parsed = parseDischarge(normalizeDischargeText(smashed))
    assert.equal(parsed.error, undefined)
    assert.equal(parsed.name, 'Jordan Ellis')
    assert.equal(parsed.city, 'Great Bend')
    assert.equal(parsed.medications.length, 3)
    assert.match(parsed.physicalTherapy, /Passive range of motion/)
    assert.equal(parsed.equipment.length, 3)
  })
})

describe('texts and payments', () => {
  it('points each text at that patient page', () => {
    const href = `http://localhost:3000${patientPath(samplePatient.id)}`
    const body = englishSms({
      caregiverName: samplePatient.caregiverName,
      patientName: samplePatient.name,
      doctorName: samplePatient.doctorName,
      hospitalName: samplePatient.hospitalName,
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
    assert.equal(ANNUAL_RATE_CENTS, 500000)
    assert.equal(formatMoney(500000), '$5,000.00')
    assert.equal(volumeEstimate(500)?.annualCents, 500000)
    assert.equal(volumeEstimate(500)?.perDischargeCents, 1000)
    assert.equal(volumeEstimate(1.5), null)
    assert.equal(cardError('4242424242424242', '12/28', '123', new Date('2026-10-09T16:00:00Z')), null)
    assert.equal(cardError('4242', '12/28', '123'), 'Enter a 16-digit card number.')
    assert.equal(normalizePhone('(620) 555-0142'), '6205550142')
  })
})

describe('chart assistant', () => {
  it('answers from the medication on the chart', () => {
    const parsed = parseDischarge(sampleNote)
    const answer = answerQuestion('when is ibuprofen?', {
      name: samplePatient.name,
      caregiverName: samplePatient.caregiverName,
      doctorName: samplePatient.doctorName,
      hospitalName: samplePatient.hospitalName,
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
  it('accepts the sample chart and rejects a short phone number', () => {
    const parsed = parseDischarge(sampleNote)
    const good = validatePlan({
      ...samplePatient,
      dischargeNote: sampleNote,
      summary: '',
      medications: parsed.medications,
      physicalTherapy: parsed.physicalTherapy,
      equipment: parsed.equipment,
    })
    assert.equal(good.ok, true)
    if (good.ok) assert.match(good.value.summary, /Morgan Ellis/)
    const bad = validatePlan({
      ...samplePatient,
      phone: '555',
      dischargeNote: sampleNote,
      summary: 'Ready',
      medications: parsed.medications,
      physicalTherapy: parsed.physicalTherapy,
      equipment: parsed.equipment,
    })
    assert.equal(bad.ok, false)
  })
})
