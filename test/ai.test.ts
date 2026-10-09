import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { dischargeFromModel } from '../lib/ai'

describe('discharge model', () => {
  it('keeps a complete medication and clamps a schedule that does not fit the sliders', () => {
    const parsed = dischargeFromModel({
      name: 'Michael Carter',
      caregiverName: 'Emily Carter',
      caregiverPhone: '(202) 555-0143',
      doctorName: 'Jordan Lee, MD',
      procedure: 'lumbar fusion',
      physicalTherapy: 'Physical and occupational therapy with a walker.',
      equipment: ['Walker'],
      medications: [
        { name: 'Ibuprofen', dose: '600 mg', quantity: 1, frequencyPerDay: 3, durationDays: 7 },
        { name: 'Oxycodone', dose: '5 mg', quantity: 1, frequencyPerDay: 8, durationDays: 3 },
        { name: 'Aspirin', dose: '', quantity: 1, frequencyPerDay: 1, durationDays: 7 },
      ],
    })
    assert.equal(parsed.error, undefined)
    assert.equal(parsed.name, 'Michael Carter')
    assert.equal(parsed.caregiverName, 'Emily Carter')
    assert.equal(parsed.procedure, 'lumbar fusion')
    assert.deepEqual(parsed.equipment, ['Walker'])
    assert.deepEqual(
      parsed.medications.map((med) => [med.name, med.dose, med.frequencyPerDay, med.durationDays]),
      [
        ['Ibuprofen', '600 mg', 3, 7],
        ['Oxycodone', '5 mg', 6, 3],
      ],
    )
    assert.match(parsed.warnings.join(' '), /Oxycodone was adjusted/)
    assert.match(parsed.warnings.join(' '), /Aspirin was skipped/)
  })
})
