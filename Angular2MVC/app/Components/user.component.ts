import { Component, OnInit, ViewChild } from '@angular/core';
import { UserService } from '../Service/user.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalComponent } from 'ng2-bs3-modal/ng2-bs3-modal';
import { IUser } from '../Model/user';
import { userItem } from '../Model/userItem';
import { shoppingCart } from '../Model/shoppingCart'; //import shoppingCart class
import { DBOperation } from '../Shared/enum';
import { Observable } from 'rxjs/Rx';
import { Global } from '../Shared/global';

@Component({
    templateUrl: 'app/Components/user.component.html'
})

export class UserComponent implements OnInit {

    @ViewChild('modal') modal: ModalComponent;
    users: IUser[];
    selectedUsers: IUser[] = []; //create an empty array to store selectd chbx items
    user: IUser;
    currentUser: IUser;
    msg: string;
    indLoading: boolean = false;
    userFrm: FormGroup;
    dbops: DBOperation;
    modalTitle: string;
    modalBtnTitle: string;
    currentShoppingCart: shoppingCart; //shopping cart variable

    constructor(private fb: FormBuilder, private _userService: UserService) { }

    ngOnInit(): void {
        this.userFrm = this.fb.group({
            Id: [''],
            FirstName: ['', Validators.required],
            LastName: [''],
            Gender: ['', Validators.required]
        });
        this.LoadUsers();
        this.LoadShoppingCart();
    }
    ////////////////////////////////////////////////////////////////////////////////////////////
    checkboxChanged(userIdString: string) {
        var userId = parseInt(userIdString); //convert 
        //go through a for loop
        for (var i = 0; i < this.selectedUsers.length; i++) {
            if (this.selectedUsers[i].Id == userId) {
                this.selectedUsers.splice(i, 1); //when found, rmeove element from array
                return;
            }
        }
        //if user not in selectedlist                           
        //find the user with userid first
        var currentSelectedUser = this.findUserbyId(userId);
        if (currentSelectedUser != null) { //if not here, then append to end of selectedUsers array
            this.selectedUsers.push(currentSelectedUser);
        }
    }

    findUserbyId(userId: number) { //find the user by id
        for (var i = 0; i < this.users.length; i++) {
            if (this.users[i].Id == userId) {
                return this.users[i];
            }
            return null;
        }
    }
///////////////////////////////////////////////////////////////////////////////////////////////

    LoadShoppingCart(): void {
        this.currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
       // var selecteduserItemList = this.convertUserListToUserItemList(this.selectedUsers);
        //check if shopping cart exists from logged in/linked user
        this.currentShoppingCart = JSON.parse(localStorage.getItem("currentShoppingCart" + this.currentUser.Id));
    }

    LoadUsers(): void {
        this.indLoading = true;
        this._userService.get(Global.BASE_USER_ENDPOINT)
            .subscribe(users => { this.users = users; this.indLoading = false; },
            error => this.msg = <any>error);
    }

    addUser() {
        this.dbops = DBOperation.create;
        this.SetControlsState(true);
        this.modalTitle = "Add New User";
        this.modalBtnTitle = "Add";
        this.userFrm.reset();
        this.modal.open();
    }
////////////////////////////////////////////////////////////////////////////////////////////////////////////
    purchaseItems() {
        //current user is already logged in so we retrive current userid first
        this.currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
        var selecteduserItemList = this.convertUserListToUserItemList(this.selectedUsers);
        //check if shopping cart exists from logged in/linked user
        this.currentShoppingCart = JSON.parse(localStorage.getItem("currentShoppingCart" + this.currentUser.Id));
        if (this.currentShoppingCart == null) {
            this.currentShoppingCart = new shoppingCart();
            this.currentShoppingCart.userId = this.currentUser.Id; // who's shopping cart assigned
            this.currentShoppingCart.userItemList = selecteduserItemList;  //productlist selected via checkbox array 
            //convert selectedusers to selecteduseritems
        } else { //if user has a shopping cart
            this.currentShoppingCart.userItemList = this.mergeItemList(this.currentShoppingCart.userItemList, selecteduserItemList);
        }
        //store shopping car tot local storage
        localStorage.setItem("currentShoppingCart" + this.currentUser.Id, JSON.stringify(this.currentShoppingCart));
    }

    convertUserListToUserItemList(selectedUsers: IUser[]) { //*************************
        var userItemList: userItem[] = [];
        for (var i = 0; i < selectedUsers.length; i++) {
            var tempUserItem = new userItem();
            tempUserItem.Quantity = 1;
            tempUserItem.user = selectedUsers[i];
            tempUserItem.SubTotal = 10.00 * tempUserItem.Quantity; //asume price is 10.00
            userItemList.push(tempUserItem);
        }
        return userItemList;
    }
                                //IProduct[]   //**************************8
    mergeItemList(existingItems: userItem[], newItemList: userItem[]) { // go through item list and check merege 2 exsiting items
        var matchingFlag = false;
        for (var i = 0; i < existingItems.length; i++) {
            var currentitem = existingItems[i];
            matchingFlag = false; //everytime item retrieved new current item, reset to false
            for (var j = 0; j < newItemList.length;j++){ //check if new items match current items in list
                if (currentitem.user.Id == newItemList[j].user.Id) {
                    //new items are duplicated with existing items
                    matchingFlag = true;
                    newItemList[j].Quantity = currentitem.Quantity + newItemList[j].Quantity;
                    break;
                } 
            }
            //end of for loop, find existing item index=i, does not match any new item
            if (!matchingFlag) { // if false, add existing item to end of new item
                newItemList.push(currentitem);
            }
        }
        return newItemList; //has existing and new items
    }
/////////////////////////////////////////////////////////////////////////
    editUser(id: number) {
        this.dbops = DBOperation.update;
        this.SetControlsState(true);
        this.modalTitle = "Edit User";
        this.modalBtnTitle = "Update";
        this.user = this.users.filter(x => x.Id == id)[0];
        this.userFrm.setValue(this.user);
        this.modal.open();
    }

    deleteUser(id: number) {
        this.dbops = DBOperation.delete;
        this.SetControlsState(false);
        this.modalTitle = "Confirm to Delete?";
        this.modalBtnTitle = "Delete";
        this.user = this.users.filter(x => x.Id == id)[0];
        this.userFrm.setValue(this.user);
        this.modal.open();
    }

    onSubmit(formData: any) {
        this.msg = "";
   
        switch (this.dbops) {
            case DBOperation.create:
                this._userService.post(Global.BASE_USER_ENDPOINT, formData._value).subscribe(
                    data => {
                        if (data == 1) //Success
                        {
                            this.msg = "Data successfully added.";
                            this.LoadUsers();
                            
                        }
                        else
                        {
                            this.msg = "There is some issue in saving records, please contact to system administrator!"
                        }
                        
                        this.modal.dismiss();
                    },
                    error => {
                      this.msg = error;
                    }
                );
                break;
            case DBOperation.update:
                this._userService.put(Global.BASE_USER_ENDPOINT, formData._value.Id, formData._value).subscribe(
                    data => {
                        if (data == 1) //Success
                        {
                            this.msg = "Data successfully updated.";
                            this.LoadUsers();
                        }
                        else {
                            this.msg = "There is some issue in saving records, please contact to system administrator!"
                        }

                        this.modal.dismiss();
                    },
                    error => {
                        this.msg = error;
                    }
                );
                break;
            case DBOperation.delete:
                this._userService.delete(Global.BASE_USER_ENDPOINT, formData._value.Id).subscribe(
                    data => {
                        if (data == 1) //Success
                        {
                            this.msg = "Data successfully deleted.";
                            this.LoadUsers();
                        }
                        else {
                            this.msg = "There is some issue in saving records, please contact to system administrator!"
                        }

                        this.modal.dismiss();
                    },
                    error => {
                        this.msg = error;
                    }
                );
                break;

        }
    }

    SetControlsState(isEnable: boolean)
    {
        isEnable ? this.userFrm.enable() : this.userFrm.disable();
    }
}