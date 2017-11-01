import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  ComponentFactoryResolver,
  ViewContainerRef,
  ComponentRef,
  Injector
} from '@angular/core';
import { SuperTableFilter, ColumnState } from './interfaces';
import { SuperTableState } from './super-table-state';
import { Subscription } from 'rxjs/Subscription';
import { forEach, values } from 'lodash';

@Component({
  selector: 'super-table-enum-filter-dropdown',
  template: `
    <div class="clear-filter">
      <button class="btn btn-secondary clear-filter-btn" role="button" (click)="showAll()">show all</button>
    </div>
    <div *ngFor="let choice of column.def.filterChoices">
      <input type="checkbox" [(ngModel)]="column.filterValue[choice]" (ngModelChange)="onChoiceChange($event)" />
      {{ choice }}
    </div>
    <button role="button" class="close-dropdown" (click)="destroyMe()">&times;</button>
  `
})
export class EnumFilterDropdownComponent implements OnInit, OnDestroy {
  @Input() column: ColumnState;
  top: number;
  left: number;
  width: number;
  destroyMe: Function;

  constructor(
    private state: SuperTableState,
    private el: ElementRef
  ) {}

  ngOnInit () {
    const styles: CSSStyleDeclaration = this.el.nativeElement.style;
    styles.top = this.top + 'px';
    styles.left = this.left + 'px';
    styles.width = this.width + 'px';
  }

  ngOnDestroy () {
    // to ensure that references to parent component
    // do not prevent GC
    this.destroyMe = null;
  }

  onChoiceChange() {
    this.state.notify();
  }

  showAll() {
    forEach(this.column.filterValue, (val, key) => {
      this.column.filterValue[key] = true;
    });
    this.state.notify();
    this.destroyMe();
  }
}

@Component({
  /* tslint:disable-next-line */
  selector: '[super-table-enum-filter]',
  template: `
    <button
      [attr.title]="filter.title"
      role="button"
      (click)="toggleVisibility($event)"
      [ngClass]="{ hasDisabled : disabledFilterCount }">
      <strong>{{ filter.placeholder }}:</strong>
      <span [hidden]="disabledFilterCount != 0">showing all</span>
      <span [hidden]="disabledFilterCount == 0">filtering {{disabledFilterCount}} value(s)</span>
    </button>

  `
})
export class EnumFilterComponent implements OnInit, OnDestroy {
  @Input() filter: SuperTableFilter;
  @Input() column: ColumnState;

  private dropdown: ComponentRef<EnumFilterDropdownComponent>;
  private disabledChoices: Set<any> = new Set<any>();
  disabledFilterCount = 0;
  private subscription: Subscription;

  constructor(
    private state: SuperTableState,
    private el: ElementRef,
    private viewContainer: ViewContainerRef,
    private resolver: ComponentFactoryResolver
  ) {}

  ngOnInit () {
    // initialize filtered values to include all
    this.column.filterValue = {};
    this.column.def.filterChoices.forEach(choice => {
      this.column.filterValue[choice] = true;
    });
    this.subscription = this.state.stateChanged$.subscribe(() => {
      this.disabledFilterCount = values(this.column.filterValue)
        .filter(isEnabled => !isEnabled)
        .length;
    });
  }

  ngOnDestroy () {
    this.subscription.unsubscribe();
  }

  toggleVisibility() {
    if (this.dropdown) {
      this.dropdown.destroy();
      this.dropdown = null;
    } else {
      const clientRect: ClientRect = this.el.nativeElement.getBoundingClientRect();
      const cmpFactory = this.resolver.resolveComponentFactory(EnumFilterDropdownComponent);
      const ctxInjector: Injector = this.viewContainer.injector;
      const cmpRef: ComponentRef<EnumFilterDropdownComponent> = this.viewContainer.createComponent(cmpFactory, 0, ctxInjector);
      cmpRef.instance.column = this.column;
      cmpRef.instance.top = clientRect.top + clientRect.height;
      cmpRef.instance.left = clientRect.left;
      cmpRef.instance.width = clientRect.width;
      cmpRef.instance.destroyMe = () => {
        this.toggleVisibility();
      };
      this.dropdown = cmpRef;
      document.body.appendChild(cmpRef.location.nativeElement);
    }
  }
}
