import { Component, OnInit } from '@angular/core';
import { SchedulingService } from 'src/app/shared/services/scheduling/scheduling.service';
import { FormControl } from '@angular/forms';
import { AngularFirestore } from '@angular/fire/firestore';
import { AuthenticationService } from 'src/app/shared/services/authentication/authentication.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-asda-delivery',
  templateUrl: './asda-delivery.component.html',
  styleUrls: ['./asda-delivery.component.scss'],
})
export class AsdaDeliveryComponent implements OnInit {
  constructor(
    private firestore: AngularFirestore,
    private schedulingService: SchedulingService,
    private authenticationService: AuthenticationService
  ) {}

  postcode = new FormControl('');
  userId = this.authenticationService.getUserId();
  user = null;

  ngOnInit(): void {
    this.checkIfUserExists();
  }

  scheduleJob(store) {
    if (this.user) {
      this.updatePostCode();
    } else {
      this.firestore
        .collection('users')
        .add({ userId: this.userId, postcode: this.postcode.value });
    }
    this.schedulingService.createJob(store, {
      postcode: this.postcode.value,
      worker: 'asdaDeliveryScan',
    });
    console.log('created job');
  }

  checkIfUserExists() {
    this.firestore
      .collection('users', (ref) => ref.where('userId', '==', this.userId))
      .snapshotChanges()
      .subscribe((res) => {
        if (res.length !== 0) {
          this.user = res[0].payload.doc.data();
          console.log(this.user);
          this.postcode.setValue(this.user.postcode);
          console.log('user exists');
        }
      });
  }

  updatePostCode() {
    if (this.user.postcode !== this.postcode.value) {
      return this.firestore
        .collection('users', (ref) => ref.where('userId', '==', this.userId))
        .snapshotChanges()
        .pipe(
          map((users) =>
            users.map((user) => {
              return user.payload.doc.id;
            })
          )
        )
        .subscribe((id) => {
          this.firestore
            .doc(`users/${id}`)
            .update({ postcode: this.postcode.value });
        });
    }
  }
}
