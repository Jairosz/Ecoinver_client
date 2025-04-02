import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CultiveDetailsComponent } from './cultive-details.component';

describe('CultiveDetailsComponent', () => {
  let component: CultiveDetailsComponent;
  let fixture: ComponentFixture<CultiveDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CultiveDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CultiveDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
