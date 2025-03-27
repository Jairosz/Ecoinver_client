import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComercialPlanningComponent } from './comercial-planning.component';

describe('ComercialPlanningComponent', () => {
  let component: ComercialPlanningComponent;
  let fixture: ComponentFixture<ComercialPlanningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComercialPlanningComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComercialPlanningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
