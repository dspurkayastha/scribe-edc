import type { FormSchema } from '@/types/form-schema'

export const demographicsSchema: FormSchema = {
  pages: [{
    id: 'page1',
    title: 'Demographics',
    sections: [{
      id: 'basic_info',
      title: 'Basic Information',
      fields: [
        { id: 'full_name', type: 'text', label: 'Full Name', required: true, validation: { minLength: 2, maxLength: 100 } },
        { id: 'date_of_birth', type: 'date', label: 'Date of Birth', required: true },
        { id: 'age', type: 'integer', label: 'Age (years)', required: true, validation: { min: 0, max: 120 } },
        { id: 'sex', type: 'radio', label: 'Sex', required: true, options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
        ]},
        { id: 'ethnicity', type: 'dropdown', label: 'Ethnicity', options: [
          { value: 'hispanic', label: 'Hispanic or Latino' },
          { value: 'not_hispanic', label: 'Not Hispanic or Latino' },
          { value: 'unknown', label: 'Unknown' },
        ]},
        { id: 'phone', type: 'text', label: 'Phone Number', placeholder: '+1 (555) 000-0000' },
        { id: 'email', type: 'text', label: 'Email', validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$', patternMessage: 'Invalid email' } },
      ],
    }],
  }],
}

export const vitalsSchema: FormSchema = {
  pages: [{
    id: 'page1',
    title: 'Vital Signs',
    sections: [{
      id: 'measurements',
      title: 'Measurements',
      fields: [
        { id: 'weight', type: 'number', label: 'Weight (kg)', required: true, validation: { min: 20, max: 300 } },
        { id: 'height', type: 'number', label: 'Height (cm)', required: true, validation: { min: 50, max: 250 } },
        { id: 'bmi', type: 'calculated', label: 'BMI', expression: 'round({weight} / ({height}/100)^2, 1)', dependsOn: ['weight', 'height'] },
        { id: 'systolic_bp', type: 'integer', label: 'Systolic BP (mmHg)', required: true, validation: { min: 60, max: 300 } },
        { id: 'diastolic_bp', type: 'integer', label: 'Diastolic BP (mmHg)', required: true, validation: { min: 30, max: 200 } },
        { id: 'heart_rate', type: 'integer', label: 'Heart Rate (bpm)', required: true, validation: { min: 30, max: 250 } },
        { id: 'temperature', type: 'number', label: 'Temperature (°C)', validation: { min: 34, max: 42 }, step: 0.1 },
        { id: 'notes', type: 'textarea', label: 'Notes', rows: 3 },
      ],
    }],
  }],
}

export const adverseEventsSchema: FormSchema = {
  pages: [{
    id: 'page1',
    title: 'Adverse Events',
    sections: [{
      id: 'ae_list',
      title: 'Adverse Events',
      repeatable: true,
      minRepeat: 0,
      maxRepeat: 50,
      repeatLabel: 'Adverse Event #{n}',
      fields: [
        { id: 'description', type: 'textarea', label: 'Description', required: true, rows: 2 },
        { id: 'onset_date', type: 'date', label: 'Onset Date', required: true },
        { id: 'resolution_date', type: 'date', label: 'Resolution Date' },
        { id: 'severity', type: 'radio', label: 'Severity', required: true, options: [
          { value: 'mild', label: 'Mild' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'severe', label: 'Severe' },
        ]},
        { id: 'relatedness', type: 'dropdown', label: 'Relatedness', required: true, options: [
          { value: 'unrelated', label: 'Unrelated' },
          { value: 'unlikely', label: 'Unlikely' },
          { value: 'possible', label: 'Possible' },
          { value: 'probable', label: 'Probable' },
          { value: 'definite', label: 'Definite' },
        ]},
        { id: 'outcome', type: 'dropdown', label: 'Outcome', required: true, options: [
          { value: 'resolved', label: 'Resolved' },
          { value: 'ongoing', label: 'Ongoing' },
          { value: 'resolved_with_sequelae', label: 'Resolved with Sequelae' },
          { value: 'fatal', label: 'Fatal' },
          { value: 'unknown', label: 'Unknown' },
        ]},
        { id: 'is_sae', type: 'radio', label: 'Is this a Serious AE (SAE)?', required: true, options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]},
      ],
    }],
  }],
}
