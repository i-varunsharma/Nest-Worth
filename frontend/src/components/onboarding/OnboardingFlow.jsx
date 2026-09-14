import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PlanPreview from './PlanPreview';
import {
  CostsStep,
  DependentsStep,
  IncomeStep,
  IncomeVariesStep,
  LoanStep,
  NameStep,
} from './OnboardingSteps';
import Button from '../shared/Button';
import Container from '../shared/Container';
import Notice from '../shared/Notice';
import * as api from '../../lib/api';

/*
  One question per screen, then save everything and open the dashboard.

  Somebody who signed up with a phone number has no name yet, so the name
  question is added only for them.

  Props:
    user       the signed-in person
    household  the saved answers, or sensible defaults for a new account
*/

const MIN_NAME_LENGTH = 2;

export default function OnboardingFlow({ user, household: savedHousehold }) {
  const navigate = useNavigate();

  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState(user.name || '');
  const [household, setHousehold] = useState(savedHousehold);
  const [nameError, setNameError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const steps = [];
  if (!user.name) {
    steps.push('name');
  }
  steps.push('income', 'costs', 'steady', 'dependents', 'loan');

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;

  // A new object with the changed fields, because React only re-renders when
  // state is replaced, not when an existing object is edited.
  function changeHousehold(changes) {
    setHousehold({ ...household, ...changes });
  }

  async function saveEverything() {
    setIsSaving(true);

    if (steps.includes('name')) {
      const nameResult = await api.saveName(name);

      if (nameResult.ok === false) {
        setIsSaving(false);
        setFormError(nameResult.error);
        return;
      }
    }

    const result = await api.saveHousehold(household);

    setIsSaving(false);

    if (result.ok === false) {
      setFormError(result.error);
      return;
    }

    navigate('/dashboard');
  }

  const handleNext = () => {
    setFormError('');

    if (currentStep === 'name') {
      if (name.trim().length < MIN_NAME_LENGTH) {
        setNameError('Please enter your name.');
        return;
      }
      setNameError('');
    }

    if (isLastStep === true) {
      saveEverything();
      return;
    }

    setStepIndex(stepIndex + 1);
  };

  let question = null;

  if (currentStep === 'name') {
    question = <NameStep name={name} error={nameError} onChange={setName} />;
  } else if (currentStep === 'income') {
    question = <IncomeStep household={household} onChange={changeHousehold} />;
  } else if (currentStep === 'costs') {
    question = <CostsStep household={household} onChange={changeHousehold} />;
  } else if (currentStep === 'steady') {
    question = <IncomeVariesStep household={household} onChange={changeHousehold} />;
  } else if (currentStep === 'dependents') {
    question = <DependentsStep household={household} onChange={changeHousehold} />;
  } else {
    question = <LoanStep household={household} onChange={changeHousehold} />;
  }

  let nextLabel = 'Continue';
  if (isLastStep === true) {
    nextLabel = 'Build my plan';
  }
  if (isSaving === true) {
    nextLabel = 'Saving…';
  }

  return (
    <div className="min-h-screen bg-paper">
      <Container className="py-10 lg:py-16">
        <div className="flex items-center justify-between">
          <span className="font-display text-[21px] leading-none tracking-tight">Nestworth</span>
          <span className="text-2xs font-semibold uppercase tracking-widest2 text-muted">
            Step {stepIndex + 1} of {steps.length}
          </span>
        </div>

        <div className="mt-4 flex gap-2">
          {steps.map((stepName, index) => {
            let segmentClasses = 'h-1 flex-1 rounded-full transition-colors duration-500 ';
            if (index <= stepIndex) {
              segmentClasses = segmentClasses + 'bg-accent';
            } else {
              segmentClasses = segmentClasses + 'bg-line';
            }

            return <span key={stepName} className={segmentClasses} />;
          })}
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_0.8fr] lg:gap-20">
          <div>
            {question}

            <Notice tone="error" className="mt-8">{formError}</Notice>

            <div className="mt-12 flex items-center gap-3">
              {stepIndex > 0 ? (
                <Button variant="secondary" onClick={() => setStepIndex(stepIndex - 1)}>
                  Back
                </Button>
              ) : null}

              <Button onClick={handleNext} variant="accent" arrow disabled={isSaving}>
                {nextLabel}
              </Button>
            </div>
          </div>

          {/* Hidden on small screens, where it would push the question off the top. */}
          <div className="hidden lg:block">
            <PlanPreview household={household} />
          </div>
        </div>
      </Container>
    </div>
  );
}
