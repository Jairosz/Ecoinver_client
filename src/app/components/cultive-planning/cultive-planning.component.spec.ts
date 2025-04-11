import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CultivePlanningComponent } from './cultive-planning.component';

describe('CultivePlanningComponent', () => {
  let component: CultivePlanningComponent;
  let fixture: ComponentFixture<CultivePlanningComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CultivePlanningComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CultivePlanningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
